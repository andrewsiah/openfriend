import type { RealtimeItem } from "@openai/agents/realtime";
import { describe, expect, it, vi } from "vitest";

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

class SdkTransportHarness implements SdkTransport {
  readonly connectionListeners = new Set<ConnectionListener>();
  readonly responseStartListeners = new Set<ResponseStartListener>();
  readonly offConnectionChange =
    vi.fn<(listener: ConnectionListener) => void>();
  readonly offResponseStart =
    vi.fn<(listener: ResponseStartListener) => void>();

  on(event: "connection_change", listener: ConnectionListener): void;
  on(event: "turn_started", listener: ResponseStartListener): void;
  on(
    event: "connection_change" | "turn_started",
    listener: ConnectionListener | ResponseStartListener,
  ): void {
    if (event === "connection_change") {
      this.connectionListeners.add(listener as ConnectionListener);
      return;
    }

    this.responseStartListeners.add(listener as ResponseStartListener);
  }

  off(event: "connection_change", listener: ConnectionListener): void;
  off(event: "turn_started", listener: ResponseStartListener): void;
  off(
    event: "connection_change" | "turn_started",
    listener: ConnectionListener | ResponseStartListener,
  ): void {
    if (event === "connection_change") {
      const connectionListener = listener as ConnectionListener;
      this.connectionListeners.delete(connectionListener);
      this.offConnectionChange(connectionListener);
      return;
    }

    const responseStartListener = listener as ResponseStartListener;
    this.responseStartListeners.delete(responseStartListener);
    this.offResponseStart(responseStartListener);
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
    },
    createSdkSession,
  });

  return { createSdkSession, liveSession };
}

describe("OpenAILiveSession", () => {
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

  it("maps SDK response starts to the app callback", () => {
    const harness = createSdkSessionHarness();
    const onResponseStart = vi.fn();
    createLiveSession(harness.sdkSession, { onResponseStart });

    harness.emitResponseStart();

    expect(onResponseStart).toHaveBeenCalledOnce();
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
  });
});
