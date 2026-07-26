import { act, render, screen, waitFor } from "@testing-library/react";
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
    emitResponseStart() {
      callbacks?.onResponseStart();
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

    act(() => {
      sessionHarness.emitConnection("connected");
    });

    expect(screen.getByRole("status")).toHaveTextContent(/live/i);
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

  it("measures the latest model response-start latency", async () => {
    const user = userEvent.setup();
    const sessionHarness = createSessionHarness();
    const now = vi
      .fn<() => number>()
      .mockReturnValueOnce(1_000)
      .mockReturnValueOnce(1_120)
      .mockReturnValueOnce(2_000)
      .mockReturnValueOnce(2_140);
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
      "140 ms",
    );
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
});
