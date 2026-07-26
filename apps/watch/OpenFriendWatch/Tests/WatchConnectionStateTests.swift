import XCTest

final class WatchConnectionStateTests: XCTestCase {
  func testIdleStateDescribesTheTruthfulVoiceStatus() {
    XCTAssertEqual(
      WatchConnectionState.idle.userVisibleDescription,
      "Voice not connected"
    )
  }
}
