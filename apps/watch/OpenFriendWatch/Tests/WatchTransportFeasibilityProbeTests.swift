import XCTest

#if DEBUG
final class WatchTransportFeasibilityProbeTests: XCTestCase {
  @MainActor
  func testAcceptedOrderingOpensWebSocketOnlyAfterAudioStreamingStarts() async throws {
    var events: [String] = []
    let probe = WatchTransportFeasibilityProbe()

    try await probe.runAcceptedOrdering(
      activateAudioSession: {
        events.append("audio-session-active")
      },
      startAudioStream: {
        events.append("audio-stream-started")
      },
      openWebSocket: {
        XCTAssertEqual(
          events,
          ["audio-session-active", "audio-stream-started"]
        )
        events.append("websocket-opened")
      }
    )

    XCTAssertEqual(
      events,
      [
        "audio-session-active",
        "audio-stream-started",
        "websocket-opened",
      ]
    )
  }
}
#endif
