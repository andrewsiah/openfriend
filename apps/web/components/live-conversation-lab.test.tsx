import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";

import { listLiveModelProfiles } from "@openfriend/contracts";

import type {
  LiveHistoryItem,
  LiveSession,
  LiveSessionCallbacks,
} from "../lib/live-session";
import {
  LiveConversationLab,
  type LiveSessionFactory,
} from "./live-conversation-lab";

function createSessionHarness() {
  let callbacks: LiveSessionCallbacks | undefined;
  const session: LiveSession = {
    connect: vi.fn().mockResolvedValue(undefined),
    interrupt: vi.fn(),
    close: vi.fn(),
  };
  const createSession = vi.fn<LiveSessionFactory>((nextCallbacks) => {
    callbacks = nextCallbacks;
    return session;
  });

  return {
    createSession,
    session,
    emitConnection(status: "connecting" | "connected" | "disconnected") {
      callbacks?.onConnectionChange(status);
    },
    emitHistory(history: readonly LiveHistoryItem[]) {
      callbacks?.onHistoryChange(history);
    },
    emitUserSpeechStopped() {
      callbacks?.onUserSpeechStopped();
    },
    emitResponseStart() {
      callbacks?.onResponseStart();
    },
    emitUsageUpdate(
      usage: Parameters<LiveSessionCallbacks["onUsageUpdate"]>[0],
    ) {
      callbacks?.onUsageUpdate(usage);
    },
  };
}

function createSequentialSessionHarness(
  connectImplementations: readonly (() => Promise<void>)[] = [],
) {
  const sessions: {
    callbacks: LiveSessionCallbacks;
    session: LiveSession;
  }[] = [];
  const createSession = vi.fn<LiveSessionFactory>((callbacks) => {
    const connectImplementation = connectImplementations[sessions.length];
    const session: LiveSession = {
      connect: connectImplementation
        ? vi.fn(connectImplementation)
        : vi.fn().mockResolvedValue(undefined),
      interrupt: vi.fn(),
      close: vi.fn(),
    };
    sessions.push({ callbacks, session });
    return session;
  });

  return {
    createSession,
    sessions,
    emitConnection(
      sessionIndex: number,
      status: "connecting" | "connected" | "disconnected",
    ) {
      sessions[sessionIndex]?.callbacks.onConnectionChange(status);
    },
  };
}

afterEach(() => {
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("LiveConversationLab", () => {
  it("requests an Economy client secret only after Start and announces live", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        clientSecret: "ek_test_ephemeral",
        expiresAt: 1_900_000_000,
        model: "gpt-realtime-2.1-mini",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent(/idle/i);
    expect(screen.getByRole("radio", { name: /economy/i })).toBeChecked();
    expect(fetchMock).not.toHaveBeenCalled();

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(screen.getByRole("status")).toHaveTextContent(/connecting/i);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/realtime/client-secret",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ profile: "economy" }),
      }),
    );
    expect(sessionHarness.session.connect).toHaveBeenCalledWith(
      "ek_test_ephemeral",
    );
    expect(sessionHarness.createSession).toHaveBeenCalledWith(
      expect.any(Object),
      "gpt-realtime-2.1-mini",
    );

    act(() => {
      sessionHarness.emitConnection("connected");
    });

    expect(screen.getByRole("status")).toHaveTextContent(/live/i);
  });

  it("fails and closes a session when connection negotiation never settles", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSequentialSessionHarness([
      () => new Promise<void>(() => undefined),
    ]);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        connectionTimeoutMs={10}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/failed/i);
    });
    expect(sessionHarness.sessions[0]?.session.close).toHaveBeenCalledOnce();

    act(() => {
      sessionHarness.emitConnection(0, "connected");
    });
    expect(screen.getByRole("status")).toHaveTextContent(/failed/i);
  });

  it("fails when the initial client-secret request never settles", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockReturnValue(new Promise<Response>(() => undefined)),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        connectionTimeoutMs={10}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    await waitFor(() => {
      expect(screen.getByRole("status")).toHaveTextContent(/failed/i);
    });
    expect(sessionHarness.createSession).not.toHaveBeenCalled();
  });

  it("clears the connection timeout after the session becomes live", async () => {
    vi.useFakeTimers();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        connectionTimeoutMs={10}
      />,
    );

    fireEvent.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(sessionHarness.createSession).toHaveBeenCalledOnce();
    act(() => {
      sessionHarness.emitConnection("connected");
      vi.advanceTimersByTime(20);
    });

    expect(screen.getByRole("status")).toHaveTextContent(/live/i);
    expect(sessionHarness.session.close).not.toHaveBeenCalled();
  });

  it("locks the profile choice as soon as a session starts", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(screen.getByRole("radio", { name: /economy/i })).toBeDisabled();
    expect(screen.getByRole("radio", { name: /quality/i })).toBeDisabled();
  });

  it("uses the model bound to the minted client secret", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "server-bound-model",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(sessionHarness.createSession).toHaveBeenCalledWith(
      expect.any(Object),
      "server-bound-model",
    );
  });

  it("moves focus to the status announcement after Start", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(screen.getByRole("status")).toHaveFocus();
  });

  it("requests the profile selected before the session", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        clientSecret: "ek_test_ephemeral",
        expiresAt: 1_900_000_000,
        model: "gpt-realtime-2.1",
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    await user.click(screen.getByRole("radio", { name: /quality/i }));
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/realtime/client-secret",
      expect.objectContaining({
        body: JSON.stringify({ profile: "quality" }),
      }),
    );
  });

  it("shows one fixed guide and the current capability disclosure", () => {
    render(<LiveConversationLab profiles={listLiveModelProfiles()} />);

    const guide = screen.getByRole("region", {
      name: /same guide for both profiles/i,
    });
    expect(guide).toHaveTextContent(
      "I’ve had a long day. Help me reset in one minute.",
    );
    expect(guide).toHaveTextContent(
      "Help me choose between a quiet evening and seeing friends.",
    );
    expect(guide).toHaveTextContent(
      "Actually, make that practical: give me one next step.",
    );
    expect(screen.getByText(/both profiles support/i)).toHaveTextContent(
      /full-duplex audio.*interruption.*tool use/i,
    );
  });

  it("requires a rating before saving an ended run with median latency and cost", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_100)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_400)
      .mockReturnValueOnce(3_000)
      .mockReturnValueOnce(3_600);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        now={now}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection("connected");
      sessionHarness.emitUserSpeechStopped();
      sessionHarness.emitResponseStart();
      sessionHarness.emitUserSpeechStopped();
      sessionHarness.emitResponseStart();
      sessionHarness.emitUsageUpdate({
        uncachedInputTextTokens: 1_000,
        cachedInputTextTokens: 0,
        uncachedInputAudioTokens: 1_000,
        cachedInputAudioTokens: 0,
        uncachedInputUnknownTokens: 0,
        cachedInputUnknownTokens: 0,
        outputTextTokens: 1_000,
        outputAudioTokens: 1_000,
        outputUnknownTokens: 0,
      });
    });
    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );

    const saveButton = screen.getByRole("button", {
      name: /save economy result/i,
    });
    expect(saveButton).toBeDisabled();
    await user.click(screen.getByRole("radio", { name: /5.*excellent/i }));
    expect(saveButton).toBeEnabled();
    await user.click(saveButton);

    const result = screen.getByRole("article", {
      name: /economy result/i,
    });
    expect(result).toHaveTextContent("500 ms");
    expect(result).toHaveTextContent("5 / 5");
    expect(result).toHaveTextContent("$0.0330");
    expect(result).not.toHaveTextContent(/conversation transcript/i);
  });

  it("prepares the other profile without starting its microphone", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => sessionHarness.emitConnection("connected"));
    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );
    await user.click(screen.getByRole("radio", { name: /4.*good/i }));
    await user.click(
      screen.getByRole("button", { name: /save economy result/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /prepare quality session/i }),
    );

    expect(screen.getByRole("radio", { name: /quality/i })).toBeChecked();
    expect(screen.getByRole("status")).toHaveTextContent(/idle/i);
    expect(sessionHarness.createSession).toHaveBeenCalledOnce();
    expect(sessionHarness.session.close).toHaveBeenCalledOnce();
    expect(
      screen.getByRole("button", { name: /start live conversation/i }),
    ).toBeEnabled();
  });

  it("resets a comparison from a live second session and closes its media", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockImplementation(() =>
        Promise.resolve(
          Response.json({
            clientSecret: "ek_test_ephemeral",
            expiresAt: 1_900_000_000,
            model: "gpt-realtime-2.1-mini",
          }),
        ),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => sessionHarness.emitConnection("connected"));
    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );
    await user.click(screen.getByRole("radio", { name: /4.*good/i }));
    await user.click(
      screen.getByRole("button", { name: /save economy result/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /prepare quality session/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    await waitFor(() =>
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(2),
    );
    act(() => sessionHarness.emitConnection("connected"));

    await user.click(screen.getByRole("button", { name: /reset comparison/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/idle/i);
    expect(screen.getByRole("radio", { name: /economy/i })).toBeChecked();
    expect(
      screen.queryByRole("article", { name: /economy result/i }),
    ).not.toBeInTheDocument();
    expect(sessionHarness.session.close).toHaveBeenCalledTimes(2);
  });

  it("shows a sanitized failure when the secret request fails", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          Response.json({ error: "private upstream detail" }, { status: 502 }),
        ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(
      /failed.*could not continue/i,
    );
    expect(
      screen.queryByText(/private upstream detail/i),
    ).not.toBeInTheDocument();
    expect(sessionHarness.createSession).not.toHaveBeenCalled();
  });

  it("rejects a standard API key returned by the server", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "standard-api-key-placeholder",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    expect(await screen.findByRole("status")).toHaveTextContent(/failed/i);
    expect(sessionHarness.createSession).not.toHaveBeenCalled();
  });

  it("renders user and assistant transcript updates in memory", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    act(() => {
      sessionHarness.emitHistory([
        {
          id: "user-1",
          role: "user",
          status: "completed",
          text: "How are you today?",
        },
        {
          id: "assistant-1",
          role: "assistant",
          status: "in_progress",
          text: "Glad to be here with you.",
        },
      ]);
    });

    const transcript = screen.getByRole("log", {
      name: /conversation transcript/i,
    });
    expect(transcript).toHaveTextContent("How are you today?");
    expect(transcript).toHaveTextContent("Glad to be here with you.");
    expect(transcript).toHaveTextContent(/you/i);
    expect(transcript).toHaveTextContent(/openfriend/i);
  });

  it("measures connection latency with the injected clock", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_248);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        now={now}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    act(() => {
      sessionHarness.emitConnection("connected");
    });

    expect(screen.getByText(/connection/i).parentElement).toHaveTextContent(
      "248 ms",
    );
  });

  it("measures response start from speech stopped even when transcription finalizes later", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_120)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_600)
      .mockReturnValue(9_000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        now={now}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    act(() => {
      sessionHarness.emitConnection("connected");
      sessionHarness.emitUserSpeechStopped();
      sessionHarness.emitResponseStart();
      sessionHarness.emitHistory([
        {
          id: "user-1",
          role: "user",
          status: "completed",
          text: "Tell me something.",
        },
      ]);
      sessionHarness.emitResponseStart();
    });

    expect(screen.getByText(/response start/i).parentElement).toHaveTextContent(
      "600 ms",
    );
    expect(now).toHaveBeenCalledTimes(4);
  });

  it("uses the latest speech stop once for the next voice response", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_100)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_300)
      .mockReturnValueOnce(2_700)
      .mockReturnValue(9_000);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        now={now}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    act(() => {
      sessionHarness.emitConnection("connected");
      sessionHarness.emitUserSpeechStopped();
      sessionHarness.emitUserSpeechStopped();
      sessionHarness.emitResponseStart();
      sessionHarness.emitResponseStart();
    });

    expect(screen.getByText(/response start/i).parentElement).toHaveTextContent(
      "400 ms",
    );
    expect(now).toHaveBeenCalledTimes(5);
  });

  it("does not measure a missing or negative voice-response interval", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_100)
      .mockReturnValueOnce(3_000)
      .mockReturnValueOnce(2_900);
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
        now={now}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    act(() => {
      sessionHarness.emitConnection("connected");
      sessionHarness.emitResponseStart();
      sessionHarness.emitUserSpeechStopped();
      sessionHarness.emitResponseStart();
    });

    expect(screen.getByText(/response start/i).parentElement).toHaveTextContent(
      "Not measured",
    );
    expect(now).toHaveBeenCalledTimes(4);
  });

  it("enables manual interruption only while live", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );

    const interruptButton = screen.getByRole("button", {
      name: /interrupt openfriend/i,
    });
    expect(interruptButton).toBeDisabled();

    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection("connected");
    });
    await user.click(interruptButton);

    expect(sessionHarness.session.interrupt).toHaveBeenCalledOnce();
  });

  it("ends a live session and closes its media", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection("connected");
    });

    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );

    expect(sessionHarness.session.close).toHaveBeenCalledOnce();
    expect(screen.getByRole("status")).toHaveTextContent(/ended/i);
    expect(screen.getByRole("status")).toHaveFocus();
    expect(
      screen.getByRole("button", { name: /interrupt openfriend/i }),
    ).toBeDisabled();
  });

  it("resets an ended session and clears session-local history and latency", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection("connected");
      sessionHarness.emitHistory([
        {
          id: "user-1",
          role: "user",
          status: "completed",
          text: "This must not survive reset.",
        },
      ]);
    });
    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );

    await user.click(screen.getByRole("button", { name: /reset voice lab/i }));

    expect(screen.getByRole("status")).toHaveTextContent(/idle/i);
    expect(screen.getByRole("radio", { name: /economy/i })).toBeEnabled();
    expect(
      screen.getByRole("button", { name: /start live conversation/i }),
    ).toBeEnabled();
    expect(screen.getByRole("log")).not.toHaveTextContent(
      "This must not survive reset.",
    );
    expect(screen.getByText(/connection/i).parentElement).toHaveTextContent(
      "Not measured",
    );
    expect(screen.getByText(/response start/i).parentElement).toHaveTextContent(
      "Not measured",
    );
  });

  it("ends while the initial secret request is pending and ignores its late response", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    let resolveSecretRequest: ((response: Response) => void) | undefined;
    const secretRequest = new Promise<Response>((resolve) => {
      resolveSecretRequest = resolve;
    });
    vi.stubGlobal("fetch", vi.fn().mockReturnValue(secretRequest));

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    const endButton = screen.getByRole("button", {
      name: /end live conversation/i,
    });
    expect(endButton).toBeEnabled();
    await user.click(endButton);
    expect(screen.getByRole("status")).toHaveTextContent(/ended/i);
    expect(
      screen.queryByRole("button", { name: /save economy result/i }),
    ).not.toBeInTheDocument();

    await act(async () => {
      resolveSecretRequest?.(
        Response.json({
          clientSecret: "ek_test_too_late",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      );
      await secretRequest;
    });

    expect(sessionHarness.createSession).not.toHaveBeenCalled();
    expect(screen.getByRole("status")).toHaveTextContent(/ended/i);
  });

  it("ends while a replacement secret is pending and ignores its late response", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSequentialSessionHarness();
    let resolveReconnectSecret: ((response: Response) => void) | undefined;
    const reconnectSecretRequest = new Promise<Response>((resolve) => {
      resolveReconnectSecret = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_initial",
            expiresAt: 1_900_000_000,
            model: "gpt-realtime-2.1-mini",
          }),
        )
        .mockReturnValueOnce(reconnectSecretRequest),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection(0, "connected");
      sessionHarness.emitConnection(0, "disconnected");
    });

    expect(screen.getByRole("status")).toHaveTextContent(/reconnecting/i);
    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );
    expect(screen.getByRole("status")).toHaveTextContent(/ended/i);
    expect(
      screen.getByRole("button", { name: /save economy result/i }),
    ).toBeDisabled();

    await act(async () => {
      resolveReconnectSecret?.(
        Response.json({
          clientSecret: "ek_test_reconnect_too_late",
          expiresAt: 1_900_000_100,
          model: "gpt-realtime-2.1-mini",
        }),
      );
      await reconnectSecretRequest;
    });

    expect(sessionHarness.createSession).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("status")).toHaveTextContent(/ended/i);
  });

  it("ignores a secret response from before reset and restart", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSequentialSessionHarness();
    let resolveFirstSecret: ((response: Response) => void) | undefined;
    const firstSecretRequest = new Promise<Response>((resolve) => {
      resolveFirstSecret = resolve;
    });
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockReturnValueOnce(firstSecretRequest)
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_current",
            expiresAt: 1_900_000_100,
            model: "gpt-realtime-2.1-mini",
          }),
        ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    await user.click(
      screen.getByRole("button", { name: /end live conversation/i }),
    );
    await user.click(screen.getByRole("button", { name: /reset voice lab/i }));
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    await waitFor(() => {
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(1);
    });

    await act(async () => {
      resolveFirstSecret?.(
        Response.json({
          clientSecret: "ek_test_stale",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      );
      await firstSecretRequest;
    });

    expect(sessionHarness.createSession).toHaveBeenCalledTimes(1);
    expect(sessionHarness.sessions[0]?.session.connect).toHaveBeenCalledWith(
      "ek_test_current",
    );
    expect(sessionHarness.sessions[0]?.session.close).not.toHaveBeenCalled();
  });

  it("closes an active session exactly once when unmounted", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          clientSecret: "ek_test_ephemeral",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      ),
    );

    const { unmount } = render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );

    unmount();
    unmount();

    expect(sessionHarness.session.close).toHaveBeenCalledOnce();
  });

  it("reconnects once with a newly fetched client secret", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSequentialSessionHarness();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          clientSecret: "ek_test_initial",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          clientSecret: "ek_test_reconnect",
          expiresAt: 1_900_000_100,
          model: "gpt-realtime-2.1-mini",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection(0, "connected");
      sessionHarness.emitConnection(0, "disconnected");
    });

    expect(screen.getByRole("status")).toHaveTextContent(/reconnecting/i);
    await waitFor(() => {
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(2);
    });
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessionHarness.sessions[0]?.session.close).toHaveBeenCalledOnce();
    expect(sessionHarness.sessions[1]?.session.connect).toHaveBeenCalledWith(
      "ek_test_reconnect",
    );

    act(() => {
      sessionHarness.emitConnection(1, "connected");
    });
    expect(screen.getByRole("status")).toHaveTextContent(/live/i);
  });

  it("fails cleanly after a second connection loss", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSequentialSessionHarness();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        Response.json({
          clientSecret: "ek_test_initial",
          expiresAt: 1_900_000_000,
          model: "gpt-realtime-2.1-mini",
        }),
      )
      .mockResolvedValueOnce(
        Response.json({
          clientSecret: "ek_test_reconnect",
          expiresAt: 1_900_000_100,
          model: "gpt-realtime-2.1-mini",
        }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection(0, "connected");
      sessionHarness.emitConnection(0, "disconnected");
    });
    await waitFor(() => {
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(2);
    });
    act(() => {
      sessionHarness.emitConnection(1, "connected");
      sessionHarness.emitConnection(1, "disconnected");
    });

    expect(screen.getByRole("status")).toHaveTextContent(
      /failed.*could not continue/i,
    );
    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(sessionHarness.createSession).toHaveBeenCalledTimes(2);
    expect(sessionHarness.sessions[1]?.session.close).toHaveBeenCalledOnce();
  });

  it("ignores a stale connect rejection after reconnecting has begun", async () => {
    const user = userEvent.setup();
    let rejectInitialConnect: ((reason: unknown) => void) | undefined;
    const initialConnect = () =>
      new Promise<void>((_resolve, reject) => {
        rejectInitialConnect = reject;
      });
    const sessionHarness = createSequentialSessionHarness([
      initialConnect,
      () => Promise.resolve(),
    ]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_initial",
            expiresAt: 1_900_000_000,
            model: "gpt-realtime-2.1-mini",
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_reconnect",
            expiresAt: 1_900_000_100,
            model: "gpt-realtime-2.1-mini",
          }),
        ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection(0, "connected");
      sessionHarness.emitConnection(0, "disconnected");
    });
    await waitFor(() => {
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(2);
    });
    expect(rejectInitialConnect).toBeTypeOf("function");

    await act(async () => {
      rejectInitialConnect?.(new Error("stale initial connect failure"));
      await new Promise<void>((resolve) => {
        setTimeout(resolve, 0);
      });
    });
    expect(screen.getByRole("status")).toHaveTextContent(/reconnecting/i);
    act(() => {
      sessionHarness.emitConnection(1, "connected");
    });

    expect(screen.getByRole("status")).toHaveTextContent(/live/i);
  });

  it("does not count a close-triggered connect rejection as a second loss", async () => {
    const user = userEvent.setup();
    let rejectInitialConnect: ((reason: unknown) => void) | undefined;
    const initialConnect = () =>
      new Promise<void>((_resolve, reject) => {
        rejectInitialConnect = reject;
      });
    const sessionHarness = createSequentialSessionHarness([
      initialConnect,
      () => Promise.resolve(),
    ]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_initial",
            expiresAt: 1_900_000_000,
            model: "gpt-realtime-2.1-mini",
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_reconnect",
            expiresAt: 1_900_000_100,
            model: "gpt-realtime-2.1-mini",
          }),
        ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    const initialSession = sessionHarness.sessions[0];
    expect(initialSession).toBeDefined();
    vi.mocked(initialSession!.session.close).mockImplementation(() => {
      rejectInitialConnect?.(new Error("connect rejected while closing"));
    });

    act(() => {
      sessionHarness.emitConnection(0, "connected");
      sessionHarness.emitConnection(0, "disconnected");
    });

    await waitFor(() => {
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(2);
    });
    expect(screen.getByRole("status")).toHaveTextContent(/reconnecting/i);
    act(() => {
      sessionHarness.emitConnection(1, "connected");
    });
    expect(screen.getByRole("status")).toHaveTextContent(/live/i);
  });

  it("starts a reconnect when the current connected attempt later rejects", async () => {
    const user = userEvent.setup();
    let rejectConnectedAttempt: ((reason: unknown) => void) | undefined;
    const connectedAttempt = () =>
      new Promise<void>((_resolve, reject) => {
        rejectConnectedAttempt = reject;
      });
    const sessionHarness = createSequentialSessionHarness([
      connectedAttempt,
      () => Promise.resolve(),
    ]);
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_initial",
            expiresAt: 1_900_000_000,
            model: "gpt-realtime-2.1-mini",
          }),
        )
        .mockResolvedValueOnce(
          Response.json({
            clientSecret: "ek_test_reconnect",
            expiresAt: 1_900_000_100,
            model: "gpt-realtime-2.1-mini",
          }),
        ),
    );

    render(
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={sessionHarness.createSession}
      />,
    );
    await user.click(
      screen.getByRole("button", { name: /start live conversation/i }),
    );
    act(() => {
      sessionHarness.emitConnection(0, "connected");
    });

    await act(async () => {
      rejectConnectedAttempt?.(new Error("connected attempt rejected"));
      await Promise.resolve();
    });

    expect(screen.getByRole("status")).toHaveTextContent(/reconnecting/i);
    await waitFor(() => {
      expect(sessionHarness.createSession).toHaveBeenCalledTimes(2);
    });
    expect(sessionHarness.sessions[1]?.session.connect).toHaveBeenCalledWith(
      "ek_test_reconnect",
    );
  });
});
