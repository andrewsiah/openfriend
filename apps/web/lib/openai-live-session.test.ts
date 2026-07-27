import type { RealtimeItem } from "@openai/agents/realtime";
import type { Usage } from "@openai/agents";
import { beforeEach, describe, expect, it, vi } from "vitest";

const sdkConstructors = vi.hoisted(() => ({
  agent: vi.fn(),
  sessionInstance: {} as Record<string, unknown>,
  session: vi.fn(),
  webRtc: vi.fn(),
}));

vi.mock("@openai/agents/realtime", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@openai/agents/realtime")>();

  return {
    ...actual,
    OpenAIRealtimeWebRTC: class {
      constructor(...args: unknown[]) {
        sdkConstructors.webRtc(...args);
      }
    },
    RealtimeAgent: class {
      constructor(...args: unknown[]) {
        sdkConstructors.agent(...args);
      }
    },
    RealtimeSession: class {
      constructor(...args: unknown[]) {
        sdkConstructors.session(...args);
        Object.assign(this, sdkConstructors.sessionInstance);
      }
    },
  };
});

import {
  OpenAILiveSession,
  type OpenAISdkSession,
} from "./openai-live-session";
import type {
  LiveConnectionStatus,
  LiveSessionCallbacks,
} from "./live-session";

type SdkTransport = OpenAISdkSession["transport"];
type ConnectionListener = (status: LiveConnectionStatus) => void;
type ResponseStartListener = () => void;
type TurnStartedListener = () => void;
type UsageListener = (usage: Usage) => void;
type UserSpeechStoppedListener = () => void;

class SdkTransportHarness implements SdkTransport {
  readonly connectionListeners = new Set<ConnectionListener>();
  readonly responseStartListeners = new Set<ResponseStartListener>();
  readonly turnStartedListeners = new Set<TurnStartedListener>();
  readonly usageListeners = new Set<UsageListener>();
  readonly userSpeechStoppedListeners = new Set<UserSpeechStoppedListener>();
  readonly offConnectionChange =
    vi.fn<(listener: ConnectionListener) => void>();
  readonly offResponseStart =
    vi.fn<(listener: ResponseStartListener) => void>();
  readonly offUsage = vi.fn<(listener: UsageListener) => void>();
  readonly offUserSpeechStopped =
    vi.fn<(listener: UserSpeechStoppedListener) => void>();

  on(event: "connection_change", listener: ConnectionListener): void;
  on(
    event: "output_audio_buffer.started",
    listener: ResponseStartListener,
  ): void;
  on(event: "turn_started", listener: TurnStartedListener): void;
  on(event: "usage_update", listener: UsageListener): void;
  on(
    event: "input_audio_buffer.speech_stopped",
    listener: UserSpeechStoppedListener,
  ): void;
  on(
    event:
      | "connection_change"
      | "input_audio_buffer.speech_stopped"
      | "output_audio_buffer.started"
      | "turn_started"
      | "usage_update",
    listener:
      | ConnectionListener
      | ResponseStartListener
      | TurnStartedListener
      | UsageListener
      | UserSpeechStoppedListener,
  ): void {
    if (event === "connection_change") {
      this.connectionListeners.add(listener as ConnectionListener);
      return;
    }

    if (event === "input_audio_buffer.speech_stopped") {
      this.userSpeechStoppedListeners.add(
        listener as UserSpeechStoppedListener,
      );
      return;
    }

    if (event === "output_audio_buffer.started") {
      this.responseStartListeners.add(listener as ResponseStartListener);
      return;
    }

    if (event === "usage_update") {
      this.usageListeners.add(listener as UsageListener);
      return;
    }

    this.turnStartedListeners.add(listener as TurnStartedListener);
  }

  off(event: "connection_change", listener: ConnectionListener): void;
  off(
    event: "output_audio_buffer.started",
    listener: ResponseStartListener,
  ): void;
  off(event: "turn_started", listener: TurnStartedListener): void;
  off(event: "usage_update", listener: UsageListener): void;
  off(
    event: "input_audio_buffer.speech_stopped",
    listener: UserSpeechStoppedListener,
  ): void;
  off(
    event:
      | "connection_change"
      | "input_audio_buffer.speech_stopped"
      | "output_audio_buffer.started"
      | "turn_started"
      | "usage_update",
    listener:
      | ConnectionListener
      | ResponseStartListener
      | TurnStartedListener
      | UsageListener
      | UserSpeechStoppedListener,
  ): void {
    if (event === "connection_change") {
      const connectionListener = listener as ConnectionListener;
      this.connectionListeners.delete(connectionListener);
      this.offConnectionChange(connectionListener);
      return;
    }

    if (event === "input_audio_buffer.speech_stopped") {
      const userSpeechStoppedListener = listener as UserSpeechStoppedListener;
      this.userSpeechStoppedListeners.delete(userSpeechStoppedListener);
      this.offUserSpeechStopped(userSpeechStoppedListener);
      return;
    }

    if (event === "output_audio_buffer.started") {
      const responseStartListener = listener as ResponseStartListener;
      this.responseStartListeners.delete(responseStartListener);
      this.offResponseStart(responseStartListener);
      return;
    }

    if (event === "usage_update") {
      const usageListener = listener as UsageListener;
      this.usageListeners.delete(usageListener);
      this.offUsage(usageListener);
      return;
    }

    this.turnStartedListeners.delete(listener as TurnStartedListener);
  }

  emitConnectionChange(status: LiveConnectionStatus): void {
    for (const listener of this.connectionListeners) {
      listener(status);
    }
  }

  emitResponseStart(): void {
    for (const listener of this.responseStartListeners) {
      listener();
    }
  }

  emitTurnStarted(): void {
    for (const listener of this.turnStartedListeners) {
      listener();
    }
  }

  emitUsage(usage: Usage): void {
    for (const listener of this.usageListeners) {
      listener(usage);
    }
  }

  emitUserSpeechStopped(): void {
    for (const listener of this.userSpeechStoppedListeners) {
      listener();
    }
  }
}

function createSdkSessionHarness() {
  const onSessionEvent = vi.fn<OpenAISdkSession["on"]>();
  const offSessionEvent = vi.fn<OpenAISdkSession["off"]>();
  const transport = new SdkTransportHarness();
  const sdkSession: OpenAISdkSession = {
    connect: vi.fn().mockResolvedValue(undefined),
    interrupt: vi.fn(),
    close: vi.fn(),
    on: onSessionEvent,
    off: offSessionEvent,
    transport,
  };

  return {
    sdkSession,
    offSessionEvent,
    onSessionEvent,
    transport,
    emitConnectionChange(status: LiveConnectionStatus) {
      transport.emitConnectionChange(status);
    },
    emitHistory(history: RealtimeItem[]) {
      for (const [event, listener] of onSessionEvent.mock.calls) {
        if (event === "history_updated") {
          listener(history);
        }
      }
    },
    emitResponseStart() {
      transport.emitResponseStart();
    },
    emitTurnStarted() {
      transport.emitTurnStarted();
    },
    emitUsage(usage: Usage) {
      transport.emitUsage(usage);
    },
    emitUserSpeechStopped() {
      transport.emitUserSpeechStopped();
    },
  };
}

function createLiveSession(
  sdkSession: OpenAISdkSession,
  callbacks: Partial<LiveSessionCallbacks> = {},
) {
  const createSdkSession = vi.fn(() => sdkSession);
  const liveSession = new OpenAILiveSession({
    agent: {
      name: "OpenFriend",
      instructions: "Be a thoughtful conversational companion.",
    },
    model: "gpt-realtime-2.1-mini",
    callbacks: {
      onConnectionChange: callbacks.onConnectionChange ?? vi.fn(),
      onHistoryChange: callbacks.onHistoryChange ?? vi.fn(),
      onResponseStart: callbacks.onResponseStart ?? vi.fn(),
      onUsageUpdate: callbacks.onUsageUpdate ?? vi.fn(),
      onUserSpeechStopped: callbacks.onUserSpeechStopped ?? vi.fn(),
    },
    createSdkSession,
  });

  return { createSdkSession, liveSession };
}

describe("OpenAILiveSession", () => {
  beforeEach(() => {
    sdkConstructors.agent.mockReset();
    sdkConstructors.sessionInstance = {};
    sdkConstructors.session.mockReset();
    sdkConstructors.webRtc.mockReset();
  });

  it("uses near-field noise reduction and conservative semantic turn detection", () => {
    const { sdkSession } = createSdkSessionHarness();
    sdkConstructors.sessionInstance = sdkSession as unknown as Record<
      string,
      unknown
    >;

    new OpenAILiveSession({
      agent: {
        name: "OpenFriend",
        instructions: "Be a thoughtful conversational companion.",
      },
      model: "gpt-realtime-2.1-mini",
      callbacks: {
        onConnectionChange: vi.fn(),
        onHistoryChange: vi.fn(),
        onResponseStart: vi.fn(),
        onUsageUpdate: vi.fn(),
        onUserSpeechStopped: vi.fn(),
      },
    });

    expect(sdkConstructors.session).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        config: {
          audio: {
            input: {
              noiseReduction: { type: "near_field" },
              turnDetection: {
                createResponse: true,
                eagerness: "low",
                interruptResponse: true,
                type: "semantic_vad",
              },
            },
          },
        },
        transport: expect.anything(),
      }),
    );
  });

  it("enables browser speech processing before creating the WebRTC offer", async () => {
    const { sdkSession } = createSdkSessionHarness();
    sdkConstructors.sessionInstance = sdkSession as unknown as Record<
      string,
      unknown
    >;

    new OpenAILiveSession({
      agent: {
        name: "OpenFriend",
        instructions: "Be a thoughtful conversational companion.",
      },
      model: "gpt-realtime-2.1-mini",
      callbacks: {
        onConnectionChange: vi.fn(),
        onHistoryChange: vi.fn(),
        onResponseStart: vi.fn(),
        onUsageUpdate: vi.fn(),
        onUserSpeechStopped: vi.fn(),
      },
    });

    const options = sdkConstructors.webRtc.mock.calls[0]?.[0] as
      | {
          changePeerConnection?: (
            peerConnection: RTCPeerConnection,
          ) => Promise<RTCPeerConnection>;
        }
      | undefined;
    const applyConstraints = vi.fn().mockResolvedValue(undefined);
    const peerConnection = {
      getSenders: () => [
        {
          track: {
            applyConstraints,
            kind: "audio",
          },
        },
      ],
    } as unknown as RTCPeerConnection;

    await expect(options?.changePeerConnection?.(peerConnection)).resolves.toBe(
      peerConnection,
    );
    expect(applyConstraints).toHaveBeenCalledWith({
      autoGainControl: true,
      channelCount: 1,
      echoCancellation: true,
      noiseSuppression: true,
    });
  });

  it("connects the SDK session with the ephemeral client secret", async () => {
    const { sdkSession } = createSdkSessionHarness();
    const { createSdkSession, liveSession } = createLiveSession(sdkSession);

    await liveSession.connect("ek_test_ephemeral");

    expect(createSdkSession).toHaveBeenCalledOnce();
    expect(createSdkSession).toHaveBeenCalledWith(
      expect.objectContaining({ name: "OpenFriend" }),
      "gpt-realtime-2.1-mini",
    );
    expect(sdkSession.connect).toHaveBeenCalledWith({
      apiKey: "ek_test_ephemeral",
    });
  });

  it("maps SDK connection changes to the app callback", () => {
    const harness = createSdkSessionHarness();
    const onConnectionChange = vi.fn();
    createLiveSession(harness.sdkSession, { onConnectionChange });

    harness.emitConnectionChange("connecting");
    harness.emitConnectionChange("connected");
    harness.emitConnectionChange("disconnected");

    expect(onConnectionChange.mock.calls).toEqual([
      ["connecting"],
      ["connected"],
      ["disconnected"],
    ]);
  });

  it("maps SDK history updates to app transcript items", () => {
    const harness = createSdkSessionHarness();
    const onHistoryChange = vi.fn();
    createLiveSession(harness.sdkSession, { onHistoryChange });

    harness.emitHistory([
      {
        itemId: "system-1",
        type: "message",
        role: "system",
        content: [{ type: "input_text", text: "Internal instructions" }],
      },
      {
        itemId: "user-1",
        type: "message",
        role: "user",
        status: "completed",
        content: [
          {
            type: "input_audio",
            audio: null,
            transcript: "Hello there",
          },
        ],
      },
      {
        itemId: "assistant-1",
        type: "message",
        role: "assistant",
        status: "in_progress",
        content: [{ type: "output_text", text: "Hi Andrew" }],
      },
      {
        itemId: "tool-1",
        type: "function_call",
        status: "completed",
        arguments: "{}",
        name: "ignored_tool",
        output: null,
      },
    ]);

    expect(onHistoryChange).toHaveBeenCalledWith([
      {
        id: "user-1",
        role: "user",
        status: "completed",
        text: "Hello there",
      },
      {
        id: "assistant-1",
        role: "assistant",
        status: "in_progress",
        text: "Hi Andrew",
      },
    ]);
  });

  it("maps first output audio, not response creation, to the app callback", () => {
    const harness = createSdkSessionHarness();
    const onResponseStart = vi.fn();
    createLiveSession(harness.sdkSession, { onResponseStart });

    harness.emitTurnStarted();
    expect(onResponseStart).not.toHaveBeenCalled();

    harness.emitResponseStart();

    expect(onResponseStart).toHaveBeenCalledOnce();
  });

  it("maps SDK speech-stopped events to the app callback", () => {
    const harness = createSdkSessionHarness();
    const onUserSpeechStopped = vi.fn();
    createLiveSession(harness.sdkSession, { onUserSpeechStopped });

    harness.emitUserSpeechStopped();

    expect(onUserSpeechStopped).toHaveBeenCalledOnce();
  });

  it("maps SDK usage into non-overlapping token counts", () => {
    const harness = createSdkSessionHarness();
    const onUsageUpdate = vi.fn();
    createLiveSession(harness.sdkSession, { onUsageUpdate });

    harness.emitUsage({
      inputTokens: 400,
      outputTokens: 150,
      inputTokensDetails: [
        {
          text_tokens: 300,
          audio_tokens: 80,
          cached_tokens: 200,
          cached_tokens_details: {
            text_tokens: 180,
            audio_tokens: 10,
          },
        },
      ],
      outputTokensDetails: [{ text_tokens: 50, audio_tokens: 80 }],
    } as unknown as Usage);

    expect(onUsageUpdate).toHaveBeenCalledWith({
      uncachedInputTextTokens: 120,
      cachedInputTextTokens: 180,
      uncachedInputAudioTokens: 70,
      cachedInputAudioTokens: 10,
      uncachedInputUnknownTokens: 10,
      cachedInputUnknownTokens: 10,
      outputTextTokens: 50,
      outputAudioTokens: 80,
      outputUnknownTokens: 20,
    });
  });

  it("delegates manual interruption to the SDK session", () => {
    const { sdkSession } = createSdkSessionHarness();
    const { liveSession } = createLiveSession(sdkSession);

    liveSession.interrupt();

    expect(sdkSession.interrupt).toHaveBeenCalledOnce();
  });

  it("closes the SDK session only once", () => {
    const { sdkSession } = createSdkSessionHarness();
    const { liveSession } = createLiveSession(sdkSession);

    liveSession.close();
    liveSession.close();

    expect(sdkSession.close).toHaveBeenCalledOnce();
  });

  it("removes SDK event listeners during close", () => {
    const harness = createSdkSessionHarness();
    const { liveSession } = createLiveSession(harness.sdkSession);
    const historyListener = harness.onSessionEvent.mock.calls[0]?.[1];
    const connectionListener = [...harness.transport.connectionListeners][0];
    const responseStartListener = [
      ...harness.transport.responseStartListeners,
    ][0];
    const userSpeechStoppedListener = [
      ...harness.transport.userSpeechStoppedListeners,
    ][0];
    const usageListener = [...harness.transport.usageListeners][0];

    liveSession.close();

    expect(harness.offSessionEvent).toHaveBeenCalledWith(
      "history_updated",
      historyListener,
    );
    expect(harness.transport.offConnectionChange).toHaveBeenCalledWith(
      connectionListener,
    );
    expect(harness.transport.offResponseStart).toHaveBeenCalledWith(
      responseStartListener,
    );
    expect(harness.transport.offUserSpeechStopped).toHaveBeenCalledWith(
      userSpeechStoppedListener,
    );
    expect(harness.transport.offUsage).toHaveBeenCalledWith(usageListener);
  });
});
