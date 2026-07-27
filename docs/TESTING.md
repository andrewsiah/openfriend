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

## Maintenance report

Run the deterministic, report-only repository audit locally:

```bash
pnpm maintenance:report
pnpm maintenance:report --date 2026-07-26
```

The optional `--date YYYY-MM-DD` adds that date to the report and enables the
warning for dated quality-score evidence older than 90 days. Without `--date`,
the report contains no generated timestamp and does not infer staleness from
the machine clock.

The report lists repository-relative locations, stable category counts, and
remediation for:

- TODO and FIXME markers;
- skipped or focused test markers;
- production source files longer than 500 lines and test files longer than
  1,000 lines;
- missing required system-of-record documents and security automation;
- broken relative Markdown links; and
- missing or older-than-90-day core-document review dates;
- files that grew by both at least 100 lines and at least 25 percent from the
  reviewed baseline;
- missing dependency manifests, pnpm lockfiles, pnpm 10 declarations,
  Dependabot, or pull-request dependency review; and
- Pending or invalid quality-score statuses, Passing rows with blank or
  unproven evidence, plus old dated quality evidence when a date is supplied.

The size thresholds are prompts to inspect cohesion, not reasons to split code
mechanically. All findings are informational and leave the command successful;
invalid arguments and unreadable repository roots fail the command. The report
excludes `.git`, `.next`, `.turbo`, `.worktrees`, `node_modules`, `dist`,
`coverage`, and `test-results`.

The checked-in `scripts/maintenance-baseline.json` is review evidence, not an
automatically moving target. It records review dates for the required core docs
and line counts for tracked source and test files that had at least 200 lines
when the baseline was generated. Refresh it intentionally only after reviewing
the affected documents and accepting the current file structure; update
`generatedOn`, the reviewed document dates, and current line counts together.
Historical dates in plans or evidence narratives do not make a core document
stale.

The weekly and manually dispatchable GitHub workflow runs with read-only
contents permission, installs the locked pnpm dependency graph, writes the
report to the Actions job summary, and retains the Markdown artifact for three
days. It cannot create or modify issues, pull requests, or repository contents.
The workflow invokes the Node script directly so the artifact contains pure
Markdown without a package-manager banner or checkout path. Its frozen-lock
install is the live lockfile-consistency check; Dependabot and GitHub security
alerts remain authoritative for known vulnerabilities. The
`pnpm maintenance:report` command is intentionally not part of `pnpm verify`.

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

The deterministic browser story is the default pull-request gate.

The production browser capture path requests a mono microphone track with echo
cancellation, noise suppression, and automatic gain control. The Realtime
session also uses near-field input noise reduction and server VAD with a `0.65`
activation threshold, `300 ms` prefix padding, and `1,000 ms` silence
completion. VAD interrupts active output immediately, but automatic response
creation is disabled. The browser requests a response only after input
transcription completes with non-blank text, so empty audio cannot produce an
invented assistant turn.

Client-secret retrieval and WebRTC negotiation are bounded to 30 seconds. If
either remains pending, the lab must close any active media session, announce a
failed state, and ignore a late credential or connection callback. Resetting
the lab allows a fresh explicit attempt.

Before running the paired guide on a physical microphone, keep the room quiet
for at least ten seconds after the session becomes live: no assistant turn
should appear. If VAD commits a non-speech sound, a blank provider history item
must not trigger a response and must not appear in the visible transcript. This
silence gate catches false replies but does not replace a complete spoken-turn
check.

When macOS hardware capture is unavailable, the local-only synthetic Realtime
harness can verify the remaining browser transport without adding a production
route:

```bash
# Run the web app with OPENAI_API_KEY on port 3010 first.
pnpm --filter @openfriend/web test:synthetic-voice
```

Open `http://127.0.0.1:4173/` and run the synthetic conversation. The harness
generates clearly synthetic speech with macOS `say`, obtains a short-lived
credential through a local proxy to the real development API route, and
exercises the Agents SDK, WebRTC, automatic server-VAD turn commits,
transcription-gated model response, natural interruption, usage,
response-start latency, remote-stream recording, and clean close. It runs the
accepted guide through Economy and then Quality with fresh sequential sessions.

The spoken fixtures keep the accepted words but omit sentence punctuation that
causes macOS `say` to insert turn-length internal pauses. The Web Audio playback
normalizes their level and appends explicit silent frames so server VAD can
finalize each complete turn without a manual input-buffer commit. The local
harness allows up to 75 seconds for a complete spoken response; this does not
change production latency behavior. The result leaves labeled in-memory
recordings that can be downloaded before the harness reloads.

This local harness does not prove production route protection, physical
microphone capture, browser echo cancellation, noise suppression, automatic
gain control, or device switching. Those browser acceptance checks remain
separate. This command is manual, requires a real development API key, and is
billable; it must not run in routine CI.

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

The Phase 1 paired experiment uses this exact guide for both profiles:

1. “I've had a long day. Help me reset in one minute.”
2. “Help me choose between a quiet evening and seeing friends. Ask me one
   question before advising.”
3. While OpenFriend answers, redirect it: “Actually, make that practical: give
   me one next step.”

End and rate the first profile before preparing the other one. Preparing must
close the old session, return the lab to idle, clear the live transcript, and
leave the microphone off until Start. A completed pair records profile,
connection latency, median voice-response start, provider usage, estimated
cost, and a 1–5 human quality score without retaining transcript text.

Cost is an estimate based on provider-reported Realtime response usage and the
published model rates dated in the UI. Provider cached counts are subsets of
input modality totals and must be subtracted before uncached pricing.
Separately billed transcription, a response still in flight when End is
pressed, and future provider charges can be absent. Missing or zero-only usage
is unavailable, never free.

### Physical Watch

The simulator is useful but insufficient. Phase 2 requires Andrew's physical
Watch across:

| Condition                    | Evidence                                                              |
| ---------------------------- | --------------------------------------------------------------------- |
| iPhone nearby                | Start, natural/manual interruption, and End use no Watch Connectivity |
| iPhone disconnected          | Wi-Fi and Bluetooth disabled in iPhone Settings; Watch remains useful |
| Wi-Fi                        | Full-duplex audio and truthful status survive normal movement         |
| Watch cellular               | A useful outdoor conversation works with the phone absent             |
| Wrist lowered                | Active audio continues legitimately or suspension is explicit         |
| Background noise and silence | Speech remains usable and empty noise creates no assistant response   |
| Brief network loss           | One fresh empty session; no audio/event replay or duplicate work      |
| Second network loss          | Session fails and all audio/network resources close                   |
| Bluetooth route loss         | Playback stops and does not switch private audio silently to speaker  |
| Audio interruption           | Both directions pause and resume only when the system permits         |
| Watch locked or removed      | Capture ends and no bearer credential remains in durable storage      |

The defining acceptance test is a useful continuous conversation during a walk
without the phone.

Before this matrix, a signed physical feasibility gate must prove that
play-and-record audio is active before `URLSessionWebSocketTask`, simultaneous
capture/playback works, and WebSocket interruption truncates at the audio
duration actually rendered. The simulator cannot prove Apple's low-level
networking allowance. See the
[Phase 2 design](plans/2026-07-27-phase-2-watch-conversation-design.md) and
[implementation plan](plans/2026-07-27-phase-2-watch-conversation.md).

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
