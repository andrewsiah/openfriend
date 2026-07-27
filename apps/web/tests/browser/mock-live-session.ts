import type {
  LiveHistoryItem,
  LiveSession,
  LiveSessionCallbacks,
} from "../../lib/live-session";

type MockLiveSessionEvent =
  "connect" | "connect-failed" | "interrupt" | "close";

type MockLiveSessionOptions = Readonly<{
  advanceClock?: (milliseconds: number) => void;
  failConnect?: boolean;
  onEvent?: (event: MockLiveSessionEvent) => void;
}>;

const USER_TURN: LiveHistoryItem = {
  id: "synthetic-user-turn",
  role: "user",
  status: "completed",
  text: "Can you stay with me while I plan my morning?",
};

const ASSISTANT_TURN: LiveHistoryItem = {
  id: "synthetic-assistant-turn",
  role: "assistant",
  status: "completed",
  text: "Of course. What would make this morning feel manageable?",
};

export function createMockLiveSession(
  callbacks: LiveSessionCallbacks,
  options: MockLiveSessionOptions = {},
): LiveSession {
  let closed = false;
  let history: readonly LiveHistoryItem[] = [];

  return {
    async connect() {
      callbacks.onConnectionChange("connecting");

      if (options.failConnect) {
        options.onEvent?.("connect-failed");
        throw new Error("Synthetic connection failure");
      }

      options.onEvent?.("connect");
      options.advanceClock?.(12);
      callbacks.onConnectionChange("connected");
      history = [USER_TURN];
      callbacks.onHistoryChange(history);
      callbacks.onUserSpeechStopped();
      options.advanceClock?.(34);
      callbacks.onResponseStart();
      history = [USER_TURN, ASSISTANT_TURN];
      callbacks.onHistoryChange(history);
    },
    interrupt() {
      if (closed) {
        return;
      }

      options.onEvent?.("interrupt");
      const interruptedTurn: LiveHistoryItem = {
        ...ASSISTANT_TURN,
        status: "incomplete",
        text: "Interrupted at your request.",
      };
      history = [USER_TURN, interruptedTurn];
      callbacks.onHistoryChange(history);
    },
    close() {
      if (closed) {
        return;
      }

      closed = true;
      options.onEvent?.("close");
      callbacks.onConnectionChange("disconnected");
    },
  };
}
