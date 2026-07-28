#if DEBUG
@MainActor
struct WatchTransportFeasibilityProbe {
  func runAcceptedOrdering(
    activateAudioSession: () async throws -> Void,
    startAudioStream: () async throws -> Void,
    openWebSocket: () async throws -> Void
  ) async rethrows {
    try await activateAudioSession()
    try await startAudioStream()
    try await openWebSocket()
  }
}
#endif
