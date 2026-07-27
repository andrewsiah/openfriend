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
pnpm build
```

No completion claim may rely on an earlier run after code changed.

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

For Phase 1, interpret `Voice response start` as the client-observed interval
from server-detected speech stop to the first output-audio buffer. It excludes
the VAD silence window and is not derived from transcript-finalization timing.

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
exercises the Agents SDK, WebRTC, transcription, model response, manual
interruption, latency, and clean close. The result reports when an explicit
input-buffer commit was needed instead of server VAD. It does not prove
production route protection, hardware capture, echo cancellation, automatic
gain control, device switching, or natural barge-in; those browser acceptance
checks remain open.

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
