export type LiveConnectionStatus = "connecting" | "connected" | "disconnected";

export type LiveHistoryItem = Readonly<{
  id: string;
  role: "user" | "assistant";
  status: "in_progress" | "completed" | "incomplete";
  text: string;
}>;

export type LiveSessionCallbacks = Readonly<{
  onConnectionChange: (status: LiveConnectionStatus) => void;
  onHistoryChange: (history: readonly LiveHistoryItem[]) => void;
  onResponseStart: () => void;
}>;

export interface LiveSession {
  connect(clientSecret: string): Promise<void>;
  interrupt(): void;
  close(): void;
}
