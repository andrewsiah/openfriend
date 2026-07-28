# OpenFriend Watch foundation and transport feasibility gate

This is an independent SwiftUI skeleton for OpenFriend's Watch-first product
work. It truthfully presents the current user-visible state:

- `OpenFriend`
- `Watch foundation ready`
- `Voice not connected`

There is no microphone control, audio capture, authentication, Realtime
session, or production networking in this target.

Task 2A now has a `DEBUG`-only sequencing probe. Its focused simulator test
proves that the development socket-open step is invoked only after audio-session
activation and audio-stream startup complete. The target also declares the
minimum local microphone, audio background mode, and Sign in with Apple
metadata needed for the later signed diagnostic.

The probe does not open a real socket, activate real audio, or authenticate.
Those operations remain part of the signed physical-Watch hard gate.

## Local toolchain

The Task 2A simulator slice was verified on July 27, 2026 with:

- Xcode 26.6 (`17F113`)
- Apple Swift 6.3.3 (`swiftlang-6.3.3.1.3`)
- watchOS Simulator SDK 26.5 (`23T570`)
- Apple Watch Series 11 (46mm), watchOS 26.5 simulator

The test target is hostless and compiles the pure state and ordering sources
directly. This keeps the two deterministic tests independent of Watch UI
lifecycle behavior.

## Test

From the repository root:

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm),OS=26.5' \
  CODE_SIGNING_ALLOWED=NO
```

The Task 2A TDD RED run failed because
`WatchTransportFeasibilityProbe` did not exist. The focused test passed after
the three ordered development steps were implemented.

## Build

```bash
xcodebuild build \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch Series 11 (46mm),OS=26.5' \
  CODE_SIGNING_ALLOWED=NO
```

## Explicit product gate

This skeleton plus the ordering probe are development readiness, not the Phase
2 Watch experience. The browser Realtime contract is now stable and the
[Phase 2 design](../../docs/plans/2026-07-27-phase-2-watch-conversation-design.md)
plus
[TDD implementation plan](../../docs/plans/2026-07-27-phase-2-watch-conversation.md)
are written. Voice, live networking, short-lived Watch authentication, signed
physical device deployment, and field-test acceptance remain unimplemented.

The recommended design is conditional on a signed physical Watch proving that
an active play-and-record audio session permits a direct
`URLSessionWebSocketTask` and useful simultaneous capture/playback over Wi-Fi
and Watch cellular without the phone.

Do not register bundle identifiers, create provisioning profiles, select a
company team, add credentials, or claim Phase 2 from simulator evidence.
