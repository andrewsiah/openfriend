# OpenFriend Watch foundation

This is an independent, simulator-only SwiftUI skeleton for OpenFriend's
Watch-first product work. It truthfully presents the current state:

- `OpenFriend`
- `Watch foundation ready`
- `Voice not connected`

There is no microphone control, audio capture, networking, authentication,
Realtime session, or background execution in this target.

## Local toolchain

Verified on July 26, 2026 with:

- Xcode 26.3 (`17C529`)
- Apple Swift 6.2.4 (`swiftlang-6.2.4.1.4`)
- watchOS Simulator SDK 26.2 (`23S303`)
- Apple Watch SE 3 (40mm), watchOS 26.2 simulator

The test target is hostless and compiles the pure connection-state source
directly. This keeps the single deterministic state test independent of Watch
UI lifecycle behavior.

## Test

From the repository root:

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO
```

The TDD RED run failed at
`WatchConnectionState.idle.userVisibleDescription` because
`WatchConnectionState` did not exist. The same unsigned simulator command
passed after the idle state was implemented.

## Build

```bash
xcodebuild build \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO
```

## Explicit product gate

This skeleton is Phase 0 development readiness, not the Phase 3 Watch
experience. Voice, networking, short-lived authentication, signing, physical
device deployment, and field-test acceptance remain blocked until the browser
Realtime session contract is stable and Andrew confirms a personal Apple
Developer team.

Do not register bundle identifiers, create provisioning profiles, select a
company team, or add credentials while working on this skeleton.
