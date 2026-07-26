import SwiftUI

struct ContentView: View {
  let connectionState: WatchConnectionState

  var body: some View {
    VStack(alignment: .leading, spacing: 6) {
      Text("OpenFriend")
        .font(.headline)

      Spacer()

      Text("Watch foundation ready")
        .font(.caption)

      Text(connectionState.userVisibleDescription)
        .font(.footnote)
        .foregroundStyle(.secondary)
    }
    .frame(maxWidth: .infinity, alignment: .leading)
    .padding()
  }
}

#Preview {
  ContentView(connectionState: .idle)
}
