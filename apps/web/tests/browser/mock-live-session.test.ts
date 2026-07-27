import { describe, expect, it, vi } from "vitest";

import type {
  LiveHistoryItem,
  LiveSessionCallbacks,
} from "../../lib/live-session";
import { createMockLiveSession } from "./mock-live-session";

function createCallbackHarness() {
  const history: (readonly LiveHistoryItem[])[] = [];
  const order: string[] = [];
  const callbacks: LiveSessionCallbacks = {
    onConnectionChange(status) {
      order.push(`connection:${status}`);
    },
    onHistoryChange(nextHistory) {
      history.push(nextHistory);
      order.push(`history:${nextHistory.length}`);
    },
    onUserSpeechStopped() {
      order.push("speech-stopped");
    },
    onResponseStart() {
      order.push("response-start");
    },
  };

  return { callbacks, history, order };
}

describe("deterministic mock LiveSession", () => {
  it("connects and emits transcript and speech-to-response events in a stable order", async () => {
    const harness = createCallbackHarness();
    const advanceClock = vi.fn();
    const onConnect = vi.fn();
    const events: string[] = [];
    const session = createMockLiveSession(harness.callbacks, {
      advanceClock,
      onConnect,
      onEvent: (event) => events.push(event),
    });

    await session.connect("ek_synthetic_browser_test");

    expect(harness.order).toEqual([
      "connection:connecting",
      "connection:connected",
      "history:1",
      "speech-stopped",
      "response-start",
      "history:2",
    ]);
    expect(harness.history.at(-1)).toEqual([
      expect.objectContaining({
        role: "user",
        status: "completed",
        text: "Can you stay with me while I plan my morning?",
      }),
      expect.objectContaining({
        role: "assistant",
        status: "completed",
        text: "Of course. What would make this morning feel manageable?",
      }),
    ]);
    expect(advanceClock.mock.calls).toEqual([[12], [34]]);
    expect(onConnect).toHaveBeenCalledExactlyOnceWith(
      "ek_synthetic_browser_test",
    );
    expect(events).toEqual(["connect"]);
  });

  it("interrupts the active response and closes only once", async () => {
    const harness = createCallbackHarness();
    const events: string[] = [];
    const session = createMockLiveSession(harness.callbacks, {
      onEvent: (event) => events.push(event),
    });

    await session.connect("ek_synthetic_browser_test");
    session.interrupt();
    session.close();
    session.close();

    expect(harness.history.at(-1)?.at(-1)).toEqual(
      expect.objectContaining({
        role: "assistant",
        status: "incomplete",
        text: "Interrupted at your request.",
      }),
    );
    expect(events).toEqual(["connect", "interrupt", "close"]);
    expect(harness.order.at(-1)).toBe("connection:disconnected");
  });

  it("fails deterministically without publishing conversation history", async () => {
    const harness = createCallbackHarness();
    const events: string[] = [];
    const session = createMockLiveSession(harness.callbacks, {
      failConnect: true,
      onEvent: (event) => events.push(event),
    });

    await expect(session.connect("ek_synthetic_browser_test")).rejects.toThrow(
      "Synthetic connection failure",
    );
    session.close();

    expect(harness.history).toEqual([]);
    expect(harness.order).toEqual([
      "connection:connecting",
      "connection:disconnected",
    ]);
    expect(events).toEqual(["connect-failed", "close"]);
  });
});
