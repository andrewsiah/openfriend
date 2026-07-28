# Phase 2 Phone-Free Watch Conversation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `superpowers:executing-plans` to
> implement this plan task-by-task. Codex remains the executor and verifier.

**Goal:** Let Andrew hold one full-duplex, interruption-capable OpenAI Realtime
conversation from a signed physical Apple Watch over Wi-Fi or cellular without
using the paired iPhone data path.

**Architecture:** The independent Watch authenticates to a thin OpenFriend
gateway with a nonce-bound Sign in with Apple identity token. The gateway
verifies the accepted user and mints a 600-second, Economy-model Realtime client
secret. After activating a play-and-record audio session, the Watch connects
directly to OpenAI with `URLSessionWebSocketTask`, streams bounded mono PCM16
audio, plays incremental PCM output, and performs client-managed interruption
truncation. One reconnect may create a fresh Realtime session; nothing is
persisted.

**Tech Stack:** watchOS 26, Swift 6, SwiftUI, AuthenticationServices,
AVFAudio, Foundation `URLSessionWebSocketTask`, Next.js 16 App Router,
TypeScript, Vitest, `jose`, OpenAI Realtime WebSocket events, Xcode 26.3, and
physical Apple Watch hardware.

---

## Required design

Read and accept
[the Phase 2 design](2026-07-27-phase-2-watch-conversation-design.md) before
starting. If implementation needs a persistent relay, native WebRTC port,
Supabase, durable credentials, transcript storage, or an unrelated Watch
extended-runtime category, stop and write a superseding design.

## Public-repository boundaries

- Never place a populated Apple subject, identity token, Realtime client
  secret, API key, signing identity, team identifier, provisioning profile,
  transcript, or audio recording in Git, prompts, logs, fixtures, screenshots,
  or CI output.
- Use synthetic identity claims, audio samples, transcripts, and model events
  in tests.
- Keep Vercel protection enabled. Do not expose the Watch route publicly until
  authentication and rate limiting are verified.
- Do not create or mutate Apple, Vercel, OpenAI, Stripe Projects, or other
  provider resources without Andrew's explicit authorization at the applicable
  task.
- Use Andrew's personal accounts only.
- Every live or mocked audio/WebSocket test owns cleanup in `defer`,
  `addTeardownBlock`, `afterEach`, `afterAll`, or `finally`.

## Task 0: Confirm prerequisites and freeze the accepted slice

**Files:**

- Modify after confirmation:
  `docs/plans/2026-07-27-phase-2-watch-conversation.md`

**Step 1: Confirm the personal signing boundary**

Obtain explicit confirmation of:

- the personal Apple Developer team allowed to sign OpenFriend;
- authority to register or adopt the Watch App ID and Sign in with Apple
  capability;
- the personal Watch model, watchOS version, and active cellular plan;
- the personal Vercel and OpenAI development environments.

Expected: every owner is unambiguous and no company account is involved.

**Step 2: Confirm route exposure protection**

Choose an authenticated-route rate-limit mechanism on the existing personal
Vercel project. Do not add a database or new socket host.

Expected: a written limit, key, window, failure response, and verification
method exist before the route can become publicly reachable.

**Step 3: Obtain provider-mutation authority**

Obtain explicit authority to deploy the authenticated route, configure the
accepted exact-path WAF rule, and change preview deployment protection only
after application authentication and the rate limit are verified. Do not
change production promotion, domains, unrelated firewall rules, or account
scope.

**Step 4: Record the accepted constraints**

Add a dated checklist to this plan containing only non-sensitive facts:

```markdown
- [ ] Personal Apple signing team confirmed
- [ ] Watch App ID/capability changes authorized
- [ ] Physical cellular Watch identified
- [ ] Personal Vercel/OpenAI development scopes confirmed
- [ ] Authenticated-route rate limit accepted
- [ ] Watch route/WAF/preview mutation authorized
```

### Task 0 acceptance record — 2026-07-27

- [x] Personal Apple signing team confirmed — Andrew authorizes his personal
      Apple account and team for OpenFriend.
- [x] Watch App ID/capability changes authorized — Andrew authorizes Watch App
      ID and capability work.
- [x] Physical cellular Watch identified — Apple Watch Series 11 GPS + Cellular,
      watchOS 26.5, and an active cellular plan; confirmed 2026-07-27.
- [x] Personal Vercel/OpenAI development scopes confirmed — both are Andrew's
      personal accounts.
- [x] Authenticated-route rate limit accepted — exact-path WAF keyed by source
      IP, fixed one-minute window, 10 requests per IP, and an HTTP `429`
      response. Before preview exposure changes, verify the cap and `429` from
      one source IP within the window.
- [x] Watch route/WAF/preview mutation authorized — Andrew authorizes the
      authenticated Watch credential route plus its preview deployment,
      exact-path WAF, and preview protection changes after application
      authentication and rate limiting are verified.

**Step 5: Stop on any unresolved ownership**

Expected: no provider mutation begins while ownership or authority is
ambiguous. Tasks 1–2 may proceed only as local, synthetic, server-only
prerequisites; they do not require signing, a connected Watch, deployment,
public route exposure, provider mutation, or live Apple/OpenAI calls.

Stop before Task 2A until the exact personal Watch model, watchOS version,
active cellular-plan status, and working personal signing readiness are
confirmed. The Task 2A signing, deployment, WAF, preview-protection, and live
endpoint gates remain unchanged.

**Step 6: Commit the non-sensitive acceptance record**

```bash
git add docs/plans/2026-07-27-phase-2-watch-conversation.md
git commit -m "docs: accept phase 2 watch prerequisites"
```

## Task 1: Verify a nonce-bound Apple identity server-side

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/lib/watch-identity.server.test.ts`
- Create: `apps/web/lib/watch-identity.server.ts`

**Step 1: Add the mature JWT dependency**

Run:

```bash
pnpm --filter @openfriend/web add jose
```

Expected: `jose` is a runtime dependency of `@openfriend/web`; no general auth
framework is added.

**Step 2: Write the failing identity tests**

Create synthetic signed claims and cover:

```ts
type VerifiedWatchIdentity = Readonly<{
  subject: string;
}>;

type WatchIdentityEnvironment = Readonly<{
  audience: string;
  allowedSubject: string;
}>;
```

Tests must prove:

- issuer is exactly Apple's expected issuer;
- audience equals the configured Watch audience;
- expiration is in the future;
- the token nonce equals `base64url(SHA256(rawNonce))`;
- subject equals the configured single allowed subject;
- missing configuration fails closed;
- malformed, expired, wrong-audience, wrong-nonce, and wrong-subject tokens all
  return the same public authentication category;
- no failure object contains the token or subject.

Inject the JWT verification function so unit tests never call Apple or contain
a real identity.

**Step 3: Run the focused test and confirm RED**

```bash
pnpm --filter @openfriend/web test -- watch-identity.server.test.ts
```

Expected: FAIL because `watch-identity.server.ts` does not exist.

**Step 4: Implement the smallest verifier**

Use `createRemoteJWKSet` and `jwtVerify` from `jose`. Validate:

```ts
const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = new URL("https://appleid.apple.com/auth/keys");
```

Export one server-only function:

```ts
verifyWatchIdentity(
  identityToken: string,
  rawNonce: string,
  environment: WatchIdentityEnvironment,
): Promise<VerifiedWatchIdentity>
```

Do not return email, name, the original claims object, or the bearer token.

**Step 5: Run focused tests and static checks**

```bash
pnpm --filter @openfriend/web test -- watch-identity.server.test.ts
pnpm --filter @openfriend/web typecheck
pnpm --filter @openfriend/web lint
```

Expected: all commands exit 0.

**Step 6: Commit**

```bash
git add apps/web/package.json pnpm-lock.yaml apps/web/lib/watch-identity.server.ts apps/web/lib/watch-identity.server.test.ts
git commit -m "feat: verify watch identity tokens"
```

## Task 2: Add the authenticated Watch client-secret route

**Files:**

- Modify: `.env.example`
- Modify: `apps/web/app/api/realtime/client-secret/route.ts`
- Modify: `apps/web/app/api/realtime/client-secret/route.test.ts`
- Create: `apps/web/lib/realtime-client-secret.server.test.ts`
- Create: `apps/web/lib/realtime-client-secret.server.ts`
- Create: `apps/web/app/api/watch/realtime/client-secret/route.test.ts`
- Create: `apps/web/app/api/watch/realtime/client-secret/route.ts`
- Modify: `docs/INFRASTRUCTURE.md`

**Step 1: Preserve the browser route with characterization tests**

Add or confirm assertions for the existing green behavior:

- the exact Economy/Quality model match;
- the 600-second expiry request;
- the three-field response;
- sanitized failures.

Run:

```bash
pnpm --filter @openfriend/web test -- app/api/realtime/client-secret/route.test.ts
```

Expected: PASS before refactoring.

Then add one focused hardening test proving representative success, invalid
request, missing server configuration, and upstream-failure responses all set
`Cache-Control: no-store`.

Run the same focused command and confirm RED because the Phase 1 route does not
yet set the header. Add the smallest shared JSON response helper inside the
browser route, route every JSON response through it, and rerun the focused
suite to GREEN before extracting the provider helper.

**Step 2: Write a failing test for a server-only mint helper**

Define:

```ts
type MintRealtimeClientSecretInput = Readonly<{
  apiKey: string;
  model: string;
  safetyIdentifier: string;
  instructions: string;
}>;

type MintedRealtimeClientSecret = Readonly<{
  clientSecret: string;
  expiresAt: number;
  model: string;
}>;
```

Test the upstream URL, bearer header, privacy-preserving safety identifier,
600-second `expires_after`, exact model validation, malformed response, network
failure, non-JSON failure, and sanitized error category.

**Step 3: Confirm helper RED**

```bash
pnpm --filter @openfriend/web test -- realtime-client-secret.server.test.ts
```

Expected: FAIL because the helper does not exist.

**Step 4: Extract the smallest helper**

Move only provider request/validation behavior from the Phase 1 route. Keep
profile parsing and the existing Phase 1 identifier in the existing route.

Re-run:

```bash
pnpm --filter @openfriend/web test -- realtime-client-secret.server.test.ts app/api/realtime/client-secret/route.test.ts
```

Expected: both suites pass with no Phase 1 response change.

**Step 5: Write Watch route RED tests**

Cover:

- missing or malformed Authorization header returns one sanitized `401`;
- missing nonce returns the same sanitized `401`;
- valid identity mints the server-selected Economy profile;
- the Apple subject is converted to a stable keyed safety identifier and never
  forwarded directly;
- successful response is only
  `{ clientSecret, expiresAt, model }`;
- response includes `Cache-Control: no-store`;
- wrong returned model, OpenAI error, or malformed upstream response is a
  sanitized `502`;
- missing server configuration is a sanitized `503`;
- no response or logger call contains the bearer token, subject, safety
  identifier, upstream body, or permanent API key.

Inject identity verification and minting functions. Use only synthetic values.

**Step 6: Confirm Watch route RED**

```bash
pnpm --filter @openfriend/web test -- app/api/watch/realtime/client-secret/route.test.ts
```

Expected: FAIL because the route does not exist.

**Step 7: Implement the authenticated route**

Read these server-only variable names:

```text
OPENFRIEND_WATCH_APPLE_AUDIENCE
OPENFRIEND_WATCH_ALLOWED_APPLE_SUBJECT
OPENFRIEND_WATCH_SAFETY_HMAC_KEY
OPENAI_API_KEY
```

Add names and comments only to `.env.example` and `docs/INFRASTRUCTURE.md`.
Never add populated values.

The route:

1. parses bearer token and `X-OpenFriend-Nonce`;
2. verifies identity;
3. derives an OpenAI-safe identifier using HMAC-SHA256 and a stable public
   prefix, capped at 64 ASCII characters;
4. resolves only `getLiveModelProfile("economy")`;
5. calls the shared mint helper;
6. returns the narrow no-store response.

Do not add cookies, sessions, refresh tokens, Supabase, or transcript state.

**Step 8: Run focused and integrated server checks**

```bash
pnpm --filter @openfriend/web test -- realtime-client-secret.server.test.ts app/api/realtime/client-secret/route.test.ts app/api/watch/realtime/client-secret/route.test.ts
pnpm --filter @openfriend/web typecheck
pnpm --filter @openfriend/web lint
pnpm architecture:check
```

Expected: exit 0; the existing browser route remains compatible.

**Step 9: Commit**

```bash
git add .env.example apps/web/package.json pnpm-lock.yaml apps/web/app/api/realtime/client-secret apps/web/app/api/watch/realtime/client-secret apps/web/lib/realtime-client-secret.server.ts apps/web/lib/realtime-client-secret.server.test.ts docs/INFRASTRUCTURE.md
git commit -m "feat: mint authenticated watch realtime credentials"
```

## Task 2A: Prove signed audio-plus-WebSocket feasibility

This spike is a hard gate. Run it after the minimal authenticated gateway in
Tasks 1–2 and before the production Watch client in Tasks 3–8. Do not defer the
transport proof to the integrated physical test in Task 9.

### Simulator-first progress record — 2026-07-27

- [x] A `DEBUG`-only sequencing probe and focused test enforce audio-session
      activation and audio-stream startup before the WebSocket-open step.
- [x] The target declares microphone purpose text, the `audio` background
      mode, and the Sign in with Apple entitlement without recording signing
      identifiers or provisioning artifacts.
- [ ] A generic physical-device build is signed with the authorized personal
      team and required capabilities.
- [ ] The negative ordering is run on the signed physical Watch.
- [ ] The accepted ordering streams simultaneous live capture/playback over
      the direct WebSocket on the signed physical Watch.

The simulator evidence is scaffolding only. It does not enforce watchOS
low-level-networking restrictions and does not pass the Task 2A physical
feasibility gate.

**Files:**

- Create after personal-team confirmation:
  `apps/watch/OpenFriendWatch/OpenFriendWatch.entitlements`
- Create:
  `apps/watch/OpenFriendWatch/App/WatchTransportFeasibilityProbe.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`
- Modify: `apps/watch/README.md`
- Modify:
  `docs/plans/2026-07-27-phase-2-watch-conversation.md`
- Modify: `docs/QUALITY_SCORE.md`

**Step 1: Configure only the minimum signed diagnostic**

After the Task 0 authority checks pass, configure personal signing, microphone
usage, Sign in with Apple, and only the audio-streaming capability required for
this diagnostic. Keep the target watch-only. Do not add refresh tokens,
cookies, persistence, reconnect behavior, or production conversation UI.

**Step 2: Authenticate and obtain one short-lived credential safely**

After the Task 0 provider-mutation authorization, deploy the Task 2 route to
the existing personal preview, configure and publish the accepted WAF rule on
the exact Watch credential path, and verify sanitized `401`, `429`, and
no-store responses from the deployed source before making that preview path
reachable without Vercel deployment authentication. Record the non-sensitive
rule name, path, key, fixed window, request cap, `429` action, verification
time, and rollback procedure in `docs/INFRASTRUCTURE.md`. The Watch must rely
on application authentication plus the WAF rule, not a Vercel session or
protection-bypass credential.

Use `AuthenticationServices` to create a fresh raw nonce, send only its SHA-256
hash in the Sign in with Apple request, and keep the returned identity token
and raw nonce in memory. Call the authenticated Watch route from Task 2 with
that bearer token and raw nonce. Accept only the three-field Economy response
and reject a non-future expiry or model mismatch.

Do not call the protected Phase 1 browser route, carry a Vercel protection
bypass credential, disable deployment protection, or paste any credential into
source, scheme files, launch arguments, logs, screenshots, or public evidence.

**Step 3: Build the smallest physical probe**

The development-only probe:

1. confirms `supportsAudioStreaming`;
2. requests microphone permission;
3. authenticates and obtains the ephemeral credential over HTTPS;
4. activates a play-and-record `AVAudioSession`;
5. starts real capture and playback engines;
6. opens `URLSessionWebSocketTask` only after audio becomes active;
7. sends one current, official Realtime session configuration;
8. streams bounded microphone PCM and plays one bounded response;
9. closes the socket, deactivates audio, and erases both credentials.

Record only event categories and monotonic timings. Do not implement the
production protocol model, reconnect controller, authentication UI, or full
conversation UI here.

**Step 4: Prove the negative ordering**

On the same physical Watch, attempt the development socket without an active
audio stream.

Expected: the connection is unavailable or rejected consistently with Apple's
documented low-level-networking boundary, and cleanup completes.

**Step 5: Prove the accepted ordering**

Repeat with audio active before the socket opens.

Expected: the signed Watch authenticates, connects, sends live microphone
audio, receives and plays response audio, and tears both resources down. Record
the Watch model, watchOS version, date, expected result, actual sanitized
result, and cleanup state.

**Step 6: Stop if feasibility fails**

If active audio does not unlock the direct WebSocket or simultaneous capture
and playback is unusable, do not implement Tasks 3–8. Record the actual failure
and request a new transport decision. Do not add a relay or third-party WebRTC
dependency without a new accepted design.

**Step 7: Commit the bounded spike**

```bash
git add apps/watch/OpenFriendWatch/OpenFriendWatch.entitlements apps/watch/OpenFriendWatch/App/WatchTransportFeasibilityProbe.swift apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj apps/watch/README.md docs/QUALITY_SCORE.md docs/plans/2026-07-27-phase-2-watch-conversation.md
git commit -m "test: prove direct watch realtime transport"
```

## Task 3: Define the Watch Realtime wire protocol

**Files:**

- Create: `apps/watch/OpenFriendWatch/App/WatchRealtimeProtocol.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchRealtimeProtocolTests.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`

**Step 1: Write decoder RED tests**

Use synthetic JSON fixtures for:

- `session.created`;
- `session.updated`;
- `input_audio_buffer.speech_started`;
- `input_audio_buffer.speech_stopped`;
- completed non-blank and blank input transcription;
- `conversation.item.input_audio_transcription.failed` with only a sanitized
  failure category;
- `response.output_audio.delta` with `item_id`, `content_index`, and Base64
  payload;
- `response.output_audio.done`;
- `response.done` with completed, cancelled, failed, and incomplete statuses;
- `error`;
- an unknown future event.

Unknown events must decode to `.ignored(type:)`, not crash.
Cancelled responses must become terminal without reporting a failure. Failed
and incomplete responses must preserve only a sanitized status category so the
Watch cannot remain misleadingly live.

**Step 2: Write encoder RED tests**

Define and test exact output for:

```swift
enum WatchRealtimeClientEvent: Equatable {
  case updateSession(WatchRealtimeSessionConfiguration)
  case appendInputAudio(base64Audio: String)
  case createResponse
  case cancelResponse
  case truncate(itemID: String, contentIndex: Int, audioEndMilliseconds: Int)
}
```

The session configuration must express:

- realtime session type;
- audio output only;
- mono PCM input/output at 24 kHz;
- input transcription;
- near-field noise reduction when supported by the current API;
- server VAD with the Phase 1 threshold, prefix, silence, response gating, and
  interruption behavior;
- server-selected model only from the gateway response.

Before implementing, compare field names against the current official OpenAI
Realtime reference. Do not copy stale event names from an old example.

**Step 3: Run the focused Watch test and confirm RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchRealtimeProtocolTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because the protocol types do not exist.

**Step 4: Implement Codable protocol types**

Keep wire coding in this file. Do not let SwiftUI, audio, or authentication
parse raw dictionaries.

Reject malformed required fields and invalid Base64. Bound one received JSON
message before decoding; the transport task will enforce the byte limit.

**Step 5: Run focused tests and confirm GREEN**

Run the same `xcodebuild` command.

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/watch/OpenFriendWatch/App/WatchRealtimeProtocol.swift apps/watch/OpenFriendWatch/Tests/WatchRealtimeProtocolTests.swift apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj
git commit -m "feat: define watch realtime protocol"
```

## Task 4: Convert and bound microphone PCM

**Files:**

- Create: `apps/watch/OpenFriendWatch/App/WatchAudioCapture.swift`
- Create: `apps/watch/OpenFriendWatch/App/WatchPCMConverter.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchAudioCaptureTests.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchPCMConverterTests.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`

**Step 1: Write converter RED tests**

Create deterministic `AVAudioPCMBuffer` inputs and prove:

- 48 kHz mono float converts to 24 kHz mono signed PCM16;
- stereo input is downmixed before conversion;
- output is little-endian;
- 40 ms produces exactly 960 mono samples and 1,920 bytes;
- clipping saturates rather than wraps;
- an unsupported or empty buffer returns a typed failure.

**Step 2: Confirm converter RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchPCMConverterTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because `WatchPCMConverter` does not exist.

**Step 3: Implement the minimal AVAudioConverter adapter**

Export:

```swift
protocol WatchPCMConverting: Sendable {
  func convertToRealtimePCM(_ buffer: AVAudioPCMBuffer) throws -> Data
}
```

Use runtime input format and an explicit 24 kHz, mono, signed-int16 target.
Keep conversion off the main actor.

**Step 4: Write capture and backpressure RED tests**

Inject the converter and frame sink. Prove:

- capture emits only while active;
- emitted frames are 40 ms;
- unsent audio is bounded to 250 ms;
- oldest unsent frame is dropped at the bound;
- drop count changes the diagnostic to degraded;
- stop removes the tap exactly once;
- a late input callback after stop is ignored.

**Step 5: Confirm capture RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchAudioCaptureTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because `WatchAudioCapture` does not exist.

**Step 6: Implement minimal capture**

Use an `AVAudioEngine` input tap, actor-owned queue, and injected sink. Raw
buffers and Base64 data must never reach disk or logs.

**Step 7: Run both focused suites**

Run:

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchPCMConverterTests \
  -only-testing:OpenFriendWatchTests/WatchAudioCaptureTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: PASS.

**Step 8: Commit**

```bash
git add apps/watch/OpenFriendWatch/App/WatchAudioCapture.swift apps/watch/OpenFriendWatch/App/WatchPCMConverter.swift apps/watch/OpenFriendWatch/Tests/WatchAudioCaptureTests.swift apps/watch/OpenFriendWatch/Tests/WatchPCMConverterTests.swift apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj
git commit -m "feat: capture bounded watch pcm audio"
```

## Task 5: Play PCM and calculate exact interruption truncation

**Files:**

- Create: `apps/watch/OpenFriendWatch/App/WatchAudioPlayback.swift`
- Create: `apps/watch/OpenFriendWatch/App/WatchInterruptionTruncator.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchAudioPlaybackTests.swift`
- Create:
  `apps/watch/OpenFriendWatch/Tests/WatchInterruptionTruncatorTests.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`

**Step 1: Write playback-clock RED tests**

Use an injected render clock and synthetic PCM. Prove:

- response chunks remain associated with `itemID` and `contentIndex`;
- 24 kHz PCM converts to the active hardware output format;
- scheduled audio is not counted as played;
- samples actually rendered convert to floor milliseconds;
- queued unplayed audio is bounded to 500 ms;
- a delta that would overflow the queue stops playback, emits
  `response.cancel`, and truncates at the rendered duration;
- an overflow that cannot send cancellation and truncation terminates the
  session instead of dropping unreconciled audio;
- late deltas for a cancelled generation are ignored;
- stop clears scheduled audio exactly once.

**Step 2: Write truncation RED tests**

Prove:

- barge-in stops local playback before sending an event;
- `audioEndMilliseconds` uses played samples for the current item;
- one item receives at most one truncate event;
- manual interruption sends `response.cancel` then truncate;
- no active output is an idempotent no-op;
- a late output delta cannot restart truncated playback.

Expected event:

```swift
.truncate(
  itemID: "synthetic_assistant_item",
  contentIndex: 0,
  audioEndMilliseconds: 320
)
```

**Step 3: Confirm RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchAudioPlaybackTests \
  -only-testing:OpenFriendWatchTests/WatchInterruptionTruncatorTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because playback and truncation types do not exist.

**Step 4: Implement playback**

Use `AVAudioPlayerNode` and a hardware-format `AVAudioConverter`. Keep an
actor-owned queue and an injected render clock. Never infer played duration
from bytes received or buffers scheduled. If a delta would exceed 500 ms of
queued, unplayed audio, invoke the shared interruption primitive with response
cancellation. If the transport cannot send both cancellation and truncation,
fail the session; never silently discard audio while leaving the remote
conversation item intact.

**Step 5: Implement the shared interruption primitive**

Export one method used by natural and manual interruption:

```swift
func stopAndBuildTruncation(
  cancelResponse: Bool
) -> [WatchRealtimeClientEvent]
```

Stop/reset playback synchronously, snapshot played samples, mark the response
generation cancelled, then return ordered protocol events.

**Step 6: Run focused tests and confirm GREEN**

Run the command from Step 3.

Expected: PASS.

**Step 7: Commit**

```bash
git add apps/watch/OpenFriendWatch/App/WatchAudioPlayback.swift apps/watch/OpenFriendWatch/App/WatchInterruptionTruncator.swift apps/watch/OpenFriendWatch/Tests/WatchAudioPlaybackTests.swift apps/watch/OpenFriendWatch/Tests/WatchInterruptionTruncatorTests.swift apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj
git commit -m "feat: play and truncate watch audio"
```

## Task 6: Wrap URLSessionWebSocketTask with bounded I/O

**Files:**

- Create: `apps/watch/OpenFriendWatch/App/WatchRealtimeTransport.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchRealtimeTransportTests.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`

**Step 1: Define an injectable socket boundary**

```swift
protocol WatchWebSocket: Sendable {
  func resume()
  func send(_ message: URLSessionWebSocketTask.Message) async throws
  func receive() async throws -> URLSessionWebSocketTask.Message
  func sendPing() async throws
  func cancel(with closeCode: URLSessionWebSocketTask.CloseCode)
}
```

The production adapter wraps `URLSessionWebSocketTask`; tests use a fake.

**Step 2: Write transport RED tests**

Prove:

- connection URL uses the exact gateway-returned model;
- ephemeral authentication uses the currently documented OpenAI WebSocket
  handshake mechanism;
- `URLSessionConfiguration` and request use the audio-streaming network service
  type where Apple permits it;
- socket creation is rejected unless audio state is active;
- `session.created` precedes `session.update`;
- audio append waits for `session.updated`;
- receive loop decodes text only and rejects oversized messages;
- ping, receive, and connect operations have explicit timeouts;
- close is idempotent and cancels receive/send tasks;
- a stale event after close is ignored;
- no log contains a URL query credential, subprotocol credential, or audio
  payload.

**Step 3: Confirm RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchRealtimeTransportTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because the transport does not exist.

**Step 4: Implement the minimal transport actor**

Responsibilities:

- own `URLSession` and `URLSessionWebSocketTask`;
- encode/decode only through `WatchRealtimeProtocol`;
- serialize sends;
- keep one receive loop;
- enforce connect and receive limits;
- emit typed lifecycle/protocol callbacks;
- provide idempotent close.

Do not place conversation policy, audio conversion, or SwiftUI state here.

**Step 5: Run focused tests and confirm GREEN**

Run the command from Step 3.

Expected: PASS.

**Step 6: Commit**

```bash
git add apps/watch/OpenFriendWatch/App/WatchRealtimeTransport.swift apps/watch/OpenFriendWatch/Tests/WatchRealtimeTransportTests.swift apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj
git commit -m "feat: add watch realtime websocket transport"
```

## Task 7: Model one truthful Watch conversation and reconnect

**Files:**

- Modify: `apps/watch/OpenFriendWatch/App/WatchConnectionState.swift`
- Modify: `apps/watch/OpenFriendWatch/Tests/WatchConnectionStateTests.swift`
- Create: `apps/watch/OpenFriendWatch/App/WatchConversationController.swift`
- Create:
  `apps/watch/OpenFriendWatch/Tests/WatchConversationControllerTests.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`

**Step 1: Expand reducer RED tests**

Add:

```swift
enum WatchConnectionState: Equatable {
  case idle
  case authenticating
  case activatingAudio
  case connecting
  case live(hasReconnected: Bool)
  case reconnecting
  case interrupted
  case ended
  case failed(WatchFailureCategory)
}
```

Test:

- happy path to live and ended;
- auth, permission, audio activation, socket, protocol, and transcription
  failure;
- one loss enters reconnecting;
- recovery sets `hasReconnected`;
- failed reconnect and second loss are terminal;
- route loss and device lock are terminal;
- media-services reset requires a new explicit session;
- stale events cannot mutate a newer attempt.

**Step 2: Confirm reducer RED**

Run:

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchConnectionStateTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL against the idle-only enum.

**Step 3: Implement the pure reducer**

Keep user-visible descriptions factual and short. Do not put asynchronous work
in the reducer.

**Step 4: Write controller RED tests**

Inject:

- gateway credential client;
- audio-session controller;
- capture and playback;
- Realtime transport;
- clock and reconnect delay.

Prove exact order:

```text
authenticate -> fetch credential -> activate audio -> connect socket -> stream
```

Also prove:

- blank completed transcription does not call `response.create`;
- non-blank completion calls it once;
- input-transcription failure transitions to terminal
  `.failed(.transcription)` and performs full cleanup instead of silently
  waiting in `live`;
- speech-started invokes local stop/truncate immediately;
- one reconnect stops media flow, waits no more than five seconds, fetches a
  new secret, creates a new empty session, and announces lost continuity;
- no input/output/event replay occurs;
- terminal cleanup closes socket, capture, playback, observers, audio session,
  and in-memory credentials exactly once;
- stale auth, socket, and audio callbacks are ignored by attempt ID.

**Step 5: Confirm controller RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchConversationControllerTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because the controller does not exist.

**Step 6: Implement minimal orchestration**

Use one `@MainActor` observable controller for UI state and actors for audio and
transport I/O. Generate an attempt UUID at Start and check it at every
asynchronous boundary.

Observe:

- audio interruption;
- route change;
- media-services reset;
- application/device lock lifecycle.

End must be safe from every nonterminal state.

**Step 7: Run focused and full Watch simulator suites**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO
```

Expected: all Watch tests pass.

**Step 8: Commit**

```bash
git add apps/watch/OpenFriendWatch/App/WatchConnectionState.swift apps/watch/OpenFriendWatch/App/WatchConversationController.swift apps/watch/OpenFriendWatch/Tests/WatchConnectionStateTests.swift apps/watch/OpenFriendWatch/Tests/WatchConversationControllerTests.swift apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj
git commit -m "feat: orchestrate watch conversation lifecycle"
```

## Task 8: Add in-memory Watch authentication and the minimal UI

**Files:**

- Create: `apps/watch/OpenFriendWatch/App/WatchAuthentication.swift`
- Create: `apps/watch/OpenFriendWatch/App/WatchGatewayClient.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchAuthenticationTests.swift`
- Create: `apps/watch/OpenFriendWatch/Tests/WatchGatewayClientTests.swift`
- Modify: `apps/watch/OpenFriendWatch/App/ContentView.swift`
- Modify: `apps/watch/OpenFriendWatch/App/OpenFriendWatchApp.swift`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`

**Step 1: Write authentication RED tests**

Prove:

- nonce is generated from secure random bytes;
- Sign in with Apple request receives the nonce hash;
- only identity token and raw nonce reach the gateway client;
- token, nonce, and client secret are memory-only and cleared on End;
- cancel and failure produce truthful signed-out state;
- no email or name scope is requested.

**Step 2: Write gateway-client RED tests**

Using an injected `URLProtocol`, prove:

- HTTPS-only endpoint;
- bearer identity token and nonce header;
- empty JSON body;
- 10-second timeout;
- no caching;
- exact three-field response validation;
- exact Economy model validation;
- sanitized mapping for `401`, `429`, `5xx`, timeout, malformed JSON, and model
  mismatch;
- response bodies and credentials never enter diagnostics.

**Step 3: Confirm RED**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  -only-testing:OpenFriendWatchTests/WatchAuthenticationTests \
  -only-testing:OpenFriendWatchTests/WatchGatewayClientTests \
  CODE_SIGNING_ALLOWED=NO
```

Expected: FAIL because the clients do not exist.

**Step 4: Implement in-memory auth and gateway clients**

Use AuthenticationServices for Sign in with Apple and an ephemeral
`URLSessionConfiguration`. Do not use UserDefaults, Keychain, files, CloudKit,
cookies, or Watch Connectivity for bearer material.

**Step 5: Write UI behavior RED tests at the controller/view-model boundary**

Prove the UI exposes:

- Sign in and Start when idle;
- authenticating, activating audio, connecting, live, reconnecting,
  interrupted, ended, and failed text;
- microphone-sending and assistant-playing indicators;
- a single End control in all active states;
- Stop OpenFriend only while assistant audio is active;
- a clear continuity-loss message after reconnect;
- no transcript, model picker, operator status, or fake delegated work.

Do not add a UI-test target solely for these assertions. Keep view branching
small enough to test through the controller state.

**Step 6: Implement the minimal SwiftUI surface**

Preserve the current compact Watch presentation. Wire one controller through
`OpenFriendWatchApp`.

**Step 7: Run the full unsigned simulator suite and build**

```bash
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO

xcodebuild build \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO
```

Expected: both commands exit 0; simulator output still makes no physical-Watch
claim.

**Step 8: Commit**

```bash
git add apps/watch/OpenFriendWatch/App apps/watch/OpenFriendWatch/Tests apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj
git commit -m "feat: present watch live conversation"
```

## Task 9: Configure production signing and run the integrated physical gate

**Files:**

- Create after personal-team confirmation:
  `apps/watch/OpenFriendWatch/OpenFriendWatch.entitlements`
- Modify: `apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj`
- Modify: `apps/watch/README.md`
- Modify:
  `docs/plans/2026-07-27-phase-2-watch-conversation.md`
- Modify: `docs/QUALITY_SCORE.md`

**Step 1: Inspect before provider mutation**

Read-only verify:

- current Xcode signing settings;
- the signed feasibility evidence from Task 2A;
- selected personal team;
- App ID ownership;
- Sign in with Apple availability;
- Watch and phone connection state.

Expected: values are personal and are not copied into public evidence.

**Step 2: Obtain explicit mutation authority**

If App ID, capability, or provisioning changes are needed, stop and ask Andrew
for explicit authorization before changing Apple provider state.

**Step 3: Add minimum target capabilities**

After authorization:

- reuse the personal automatic or approved manual signing proven in Task 2A;
- microphone usage description;
- Sign in with Apple entitlement;
- Audio background mode only for the real streaming-audio story;
- watch-only independence remains true.

Do not enable unrelated extended-runtime, HealthKit, location, push, CloudKit,
App Attest, or companion-app capabilities.

**Step 4: Write a physical ordering diagnostic**

In a development-only diagnostic surface, record event categories and
monotonic times only:

```text
credential_received
audio_activation_started
audio_active
socket_connect_started
socket_connected
first_input_frame
first_output_frame
socket_closed
audio_inactive
```

Do not record credentials, URLs containing auth, audio, transcripts, routes
with personal names, or account identifiers.

**Step 5: Prove the negative socket case**

On the physical Watch, attempt the development socket adapter without an active
audio stream.

Expected: connection is rejected or remains unavailable as Apple documents;
cleanup completes. Record only the sanitized category.

**Step 6: Prove the accepted ordering**

On the same Watch:

1. fetch the credential by HTTPS;
2. activate play-and-record audio and complete route selection;
3. open the WebSocket;
4. stream a synthetic spoken prompt;
5. receive and play a response;
6. interrupt by speaking;
7. confirm local playback stops and one truncate event is sent;
8. End and confirm socket/audio teardown.

Expected: useful simultaneous capture/playback, correct ordering, no durable
credential.

**Step 7: Stop if feasibility fails**

Do not add a relay or WebRTC dependency. Record actual failure and request a
new design decision.

**Step 8: Record truthful evidence**

Update the plan and `docs/QUALITY_SCORE.md` with:

- date;
- Watch model and watchOS version;
- signed development build;
- expected and actual results;
- teardown confirmation;
- limitations.

Do not mark the Phase 2 field story Passing from this spike alone.

**Step 9: Run local gates**

```bash
pnpm verify
xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO
```

Expected: both exit 0.

**Step 10: Commit**

```bash
git add apps/watch/OpenFriendWatch/OpenFriendWatch.entitlements apps/watch/OpenFriendWatch.xcodeproj/project.pbxproj apps/watch/README.md docs/QUALITY_SCORE.md docs/plans/2026-07-27-phase-2-watch-conversation.md
git commit -m "test: prove watch realtime feasibility"
```

## Task 10: Pass the phone-free physical field matrix

**Files:**

- Modify: `apps/watch/README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PLANS.md`
- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/RELIABILITY.md`
- Modify: `docs/SECURITY.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/USER_STORIES.md`
- Modify:
  `docs/plans/2026-07-27-phase-2-watch-conversation.md`

**Step 1: Prepare synthetic acceptance speech**

Use the accepted Phase 1 three-turn guide with no private content. Never commit
the resulting real audio or transcript.

**Step 2: Verify iPhone-independent networking**

Run once with the iPhone nearby, then disable both Wi-Fi and Bluetooth in the
iPhone Settings app as TN3135 requires.

Expected: the Watch session remains independently useful. Control Center is not
accepted evidence of phone disconnection.

**Step 3: Verify Wi-Fi**

Start, complete three turns, naturally interrupt, use manual Stop OpenFriend,
and End while moving normally on known Wi-Fi.

Expected: full-duplex audio, bounded buffers, no false completion state, clean
teardown.

**Step 4: Verify Watch cellular without the phone**

Take the defining walk with the phone absent.

Expected: a useful continuous conversation starts, interrupts, recovers from
ordinary movement, and ends solely through Watch cellular.

**Step 5: Verify noise and silence**

Hold ten seconds of ordinary walking noise, then speak the synthetic guide.

Expected: blank/noise input does not create an assistant response; real speech
does.

**Step 6: Verify bounded reconnect**

Induce one brief network loss, then a second loss in a fresh run.

Expected:

- first loss requests one new credential and creates one empty Realtime
  session;
- no captured audio, output audio, or protocol event is replayed;
- UI discloses possible continuity loss;
- second loss fails and cleans up.

**Step 7: Verify route and system interruption**

Remove the active Bluetooth route and separately trigger an audio interruption.

Expected:

- route loss stops playback and ends without switching private audio to the
  speaker;
- system interruption pauses both directions and resumes only when allowed.

**Step 8: Verify wrist-down and device loss**

Lower the wrist during live audio, then test Watch lock/removal from wrist.

Expected: wrist-down behavior is truthful; lock/removal stops capture and no
bearer credential persists.

**Step 9: Verify provider-side route controls**

In the personal Vercel source system, verify:

- deployment protection remains enabled as intended;
- the Watch endpoint requires valid authentication;
- rate limiting returns the accepted sanitized response;
- no provider log contains credentials, identifiers, audio, or transcript;
- deployment corresponds to the reviewed commit.

Do not weaken protection to simplify testing.

**Step 10: Run fresh complete verification**

```bash
pnpm verify

xcodebuild test \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO

xcodebuild build \
  -project apps/watch/OpenFriendWatch.xcodeproj \
  -scheme OpenFriendWatch \
  -destination 'platform=watchOS Simulator,name=Apple Watch SE 3 (40mm),OS=26.2' \
  CODE_SIGNING_ALLOWED=NO
```

Expected: all commands exit 0 after the last change.

**Step 11: Scan the complete public diff silently**

Scan tracked and untracked content for:

- private keys and certificates;
- provider key/token prefixes;
- JWT-shaped values;
- populated Apple subject, team, bundle, or provisioning identifiers not
  already accepted public configuration;
- identity or Realtime bearer values;
- emails, transcripts, recordings, and provider logs.

The command must print only file counts and pass/fail, never matching content.

Expected: zero credential-shaped or personal-data matches.

**Step 12: Update status truthfully**

Only mark the Phase 2 conversation Passing if:

- signed physical Wi-Fi and cellular/no-phone tests passed;
- full duplex and both interruption paths passed;
- one reconnect and terminal second loss passed;
- route/device loss and teardown passed;
- connection and current conversation status are glanceable on the Watch;
- current local, CI, and deployed-source checks passed.

Otherwise keep each missing row Pending and state the exact next gate.

**Step 13: Request one bounded Fable/high final review if available**

Review only the integrated diff, physical evidence, security boundary, and
acceptance status. Do not substitute another Claude model if Fable is limited.

**Step 14: Commit the evidence**

```bash
git add apps/watch/README.md docs
git commit -m "docs: record phase 2 watch field evidence"
```

**Step 15: Push and stop**

Push the narrow branch. Do not merge, start web handoff, add persistence, or
begin Phase 3.

## Fable planning result

One bounded, read-only Fable/high plan review was attempted on 2026-07-27. The
Claude CLI returned:

> You've reached your Fable 5 limit. Run /usage-credits to continue or switch
> models with /model.

No review ran and no other Claude model was substituted. Andrew's explicit
prior deferral allows this plan to proceed, but the limitation is not approval.

## Current status

- Design and implementation plan: drafted.
- Production Watch code: not started.
- Watch gateway authentication: not started.
- Apple signing and capabilities: not configured or verified.
- Physical Watch feasibility: not run.
- Wi-Fi/cellular/no-phone matrix: not run.
- Phase 2 acceptance: Pending.

## Stop condition

Stop when one signed, authenticated, full-duplex Watch conversation has passed
the complete phone-free physical matrix and the evidence is recorded. Do not
start persistence, web handoff, operator work, connectors, a relay, or native
WebRTC inside this plan.
