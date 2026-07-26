export type LiveSessionState = Readonly<{
  status: "idle" | "connecting" | "live" | "reconnecting" | "ended" | "failed";
  hasReconnected: boolean;
}>;

type LiveSessionEvent =
  | Readonly<{ type: "start" }>
  | Readonly<{ type: "connected" }>
  | Readonly<{ type: "connection_lost" }>
  | Readonly<{ type: "end" }>;

export const initialLiveSessionState: LiveSessionState = {
  status: "idle",
  hasReconnected: false,
};

export function reduceLiveSessionState(
  state: LiveSessionState,
  event: LiveSessionEvent,
): LiveSessionState {
  if (state.status === "idle" && event.type === "start") {
    return { ...state, status: "connecting" };
  }

  if (state.status === "connecting" && event.type === "connected") {
    return { ...state, status: "live" };
  }

  if (state.status === "connecting" && event.type === "connection_lost") {
    return { ...state, status: "failed" };
  }

  if (
    state.status === "live" &&
    event.type === "connection_lost" &&
    !state.hasReconnected
  ) {
    return { ...state, status: "reconnecting" };
  }

  if (
    state.status === "live" &&
    event.type === "connection_lost" &&
    state.hasReconnected
  ) {
    return { ...state, status: "failed" };
  }

  if (state.status === "reconnecting" && event.type === "connected") {
    return { status: "live", hasReconnected: true };
  }

  if (state.status === "reconnecting" && event.type === "connection_lost") {
    return { ...state, status: "failed" };
  }

  if (state.status === "live" && event.type === "end") {
    return { ...state, status: "ended" };
  }

  return state;
}
