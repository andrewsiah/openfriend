# Testing

Testing follows the user journey from fast domain checks to real conversation
and physical-device evidence.

## Local quality gate

Run focused tests while developing, then:

```bash
pnpm verify
```

The complete gate covers:

```bash
pnpm test
pnpm typecheck
pnpm lint
pnpm format:check
pnpm docs:check
pnpm architecture:check
pnpm build
```

No completion claim may rely on an earlier run after code changed.

`pnpm architecture:check` reports each violation with its repository-relative
path, stable rule name, and a concrete remediation. Its focused synthetic-tree
tests run through `pnpm test` and cover both rejected and representative allowed
imports without depending on the current repository layout alone.

## Test layers

### Unit

Use for model profiles, parsing, state transitions, idempotency behavior,
approval rules, and other deterministic domain behavior.

### Integration

Use for ephemeral Realtime session creation, Supabase ownership policies,
delegated jobs, and connector adapters. Tests must use isolated development
resources and must not touch company accounts.

### Browser

Use for microphone/session controls, profile switching, live state,
interruptions, transcripts, review and approval, reconnection, keyboard access,
responsive layout, browser errors, and request failures.

The deterministic browser story mounts the real `LiveConversationLab` in a
test-only Vite page and supplies its existing `createSession` and `now`
injections. It never adds a production route, requests microphone access,
requires an API key, or reaches an external service:

```bash
pnpm test:browser
```

The runner binds Vite to loopback on an operating-system-assigned port, uses one
Chromium worker with zero retries, blocks external network access, and closes
the server in `finally`. Playwright owns page, context, and browser teardown;
the harness root is explicitly unmounted after every story. Every run writes
server, browser, console, and network logs below ignored `test-results/browser/`
paths. Failures additionally retain a trace and screenshot, and CI uploads
those artifacts for three days.

The browser stories select the Quality profile and exercise the real component
through live status, transcript updates, response-start latency, interruption,
end, reset, and idempotent close. A separate deterministic connection failure
proves that the component reaches its honest failed state and closes the
session.

## Voice and browser teardown

Every test or manual check that opens a browser, microphone, audio stream, or
billable live voice connection must clean it up before the test or task is
considered finished:

- disconnect every Realtime, WebRTC, WebSocket, and provider voice session;
- stop every microphone and audio `MediaStreamTrack`;
- close the test page, browser context, and browser process opened for the test;
- put cleanup in `afterEach`, `afterAll`, or `finally` so it also runs after
  failures, timeouts, and interruptions; and
- confirm the provider/session state is ended when that confirmation is
  available.

Never leave a browser voice test or real-time connection running in the
background. These sessions may continue incurring charges even when no test is
actively interacting with them.

For Phase 1, interpret `Voice response start` as the client-observed interval
from server-detected speech stop to the first output-audio buffer. It excludes
the VAD silence window and is not derived from transcript-finalization timing.

The deterministic browser story is the default pull-request gate. When macOS
hardware capture is unavailable, the separate local-only synthetic Realtime
harness can verify the remaining real browser transport without adding a
production route:

```bash
# Run the web app with OPENAI_API_KEY on port 3010 first.
pnpm --filter @openfriend/web test:synthetic-voice
```

Open `http://127.0.0.1:4173/` and run the synthetic conversation. The harness
generates clearly synthetic speech with macOS `say`, obtains a short-lived
credential through a local proxy to the real development API route, and
exercises the Agents SDK, WebRTC, transcription, model response, manual
interruption, latency, and clean close. The result reports when an explicit
input-buffer commit was needed instead of server VAD. It does not prove
production route protection, hardware capture, echo cancellation, automatic
gain control, device switching, or natural barge-in; those browser acceptance
checks remain open. This command is manual, requires a real development API
key, and is billable; it must not run in routine CI.

### Conversation evaluations

Evaluate product behavior, not just transcripts:

- naturalness and warmth;
- turn-taking and interruption timing;
- patience with pauses and self-correction;
- appropriate initiative;
- continuity and recall with provenance;
- honest recovery from missing context or failed tools;
- latency, quality, and cost across profiles;
- resistance to emotional overreliance and accidental disclosure.

Keep repeatable prompts and scored observations in version control when Phase 1
begins.

### Physical Watch

The simulator is useful but insufficient. Phase 2 requires Andrew's physical
Watch across:

| Condition           | Evidence                                              |
| ------------------- | ----------------------------------------------------- |
| iPhone nearby       | Conversation starts, interrupts, and ends             |
| iPhone disconnected | Watch remains independently useful                    |
| Wi-Fi               | Audio and status survive normal movement              |
| Watch cellular      | Phone-free conversation works outdoors                |
| Background noise    | Speech remains usable while walking                   |
| Brief network loss  | State is explicit and reconnect avoids duplicate work |

The defining acceptance test is a useful continuous conversation during a walk
without the phone.

The Phase 0 simulator-readiness shell has its own unsigned test and build
commands in [../apps/watch/README.md](../apps/watch/README.md). Passing them
proves only that the independent target and idle-state contract compile; it does
not satisfy any physical Watch or live-conversation acceptance criterion.

## TDD evidence

For behavior, capture:

- the focused test failing for the expected missing behavior;
- the same test passing after the smallest implementation;
- the relevant suite passing after refactor.

Generated files and configuration do not need artificial unit tests. A custom
repository script or runtime behavior does.

## Manual evidence

Record date, environment, scenario, expected result, actual result, and known
limitations in [QUALITY_SCORE.md](QUALITY_SCORE.md) or the relevant plan.
Screenshots support but do not replace behavioral verification.
