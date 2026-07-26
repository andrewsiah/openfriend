import SwiftUI

@main
struct OpenFriendWatchApp: App {
  var body: some Scene {
    WindowGroup {
      ContentView(connectionState: .idle)
    }
  }
}
