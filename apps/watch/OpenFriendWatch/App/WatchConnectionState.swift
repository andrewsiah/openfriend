enum WatchConnectionState: Equatable {
  case idle

  var userVisibleDescription: String {
    switch self {
    case .idle:
      "Voice not connected"
    }
  }
}
