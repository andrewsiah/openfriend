import { describe, expect, it } from "vitest";

import {
  initialLiveSessionState,
  reduceLiveSessionState,
} from "./live-session-state";

describe("reduceLiveSessionState", () => {
  it("moves from idle through connecting and live to ended", () => {
    const connecting = reduceLiveSessionState(initialLiveSessionState, {
      type: "start",
    });
    const live = reduceLiveSessionState(connecting, { type: "connected" });
    const ended = reduceLiveSessionState(live, { type: "end" });

    expect(connecting).toEqual({
      status: "connecting",
      hasReconnected: false,
    });
    expect(live).toEqual({ status: "live", hasReconnected: false });
    expect(ended).toEqual({ status: "ended", hasReconnected: false });
  });

  it("fails when the initial connection is lost", () => {
    const connecting = reduceLiveSessionState(initialLiveSessionState, {
      type: "start",
    });

    expect(
      reduceLiveSessionState(connecting, { type: "connection_lost" }),
    ).toEqual({ status: "failed", hasReconnected: false });
  });

  it("recovers from one connection loss", () => {
    const connecting = reduceLiveSessionState(initialLiveSessionState, {
      type: "start",
    });
    const live = reduceLiveSessionState(connecting, { type: "connected" });
    const reconnecting = reduceLiveSessionState(live, {
      type: "connection_lost",
    });
    const recovered = reduceLiveSessionState(reconnecting, {
      type: "connected",
    });

    expect(live).toEqual({ status: "live", hasReconnected: false });
    expect(reconnecting).toEqual({
      status: "reconnecting",
      hasReconnected: false,
    });
    expect(recovered).toEqual({ status: "live", hasReconnected: true });
  });

  it("fails when the reconnect attempt loses connection", () => {
    const connecting = reduceLiveSessionState(initialLiveSessionState, {
      type: "start",
    });
    const live = reduceLiveSessionState(connecting, { type: "connected" });
    const reconnecting = reduceLiveSessionState(live, {
      type: "connection_lost",
    });

    expect(
      reduceLiveSessionState(reconnecting, { type: "connection_lost" }),
    ).toEqual({ status: "failed", hasReconnected: false });
  });

  it("fails after a second connection loss", () => {
    const connecting = reduceLiveSessionState(initialLiveSessionState, {
      type: "start",
    });
    const live = reduceLiveSessionState(connecting, { type: "connected" });
    const reconnecting = reduceLiveSessionState(live, {
      type: "connection_lost",
    });
    const recovered = reduceLiveSessionState(reconnecting, {
      type: "connected",
    });
    const failed = reduceLiveSessionState(recovered, {
      type: "connection_lost",
    });

    expect(recovered).toEqual({ status: "live", hasReconnected: true });
    expect(failed).toEqual({ status: "failed", hasReconnected: true });
  });
});
