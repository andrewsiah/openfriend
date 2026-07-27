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
responsive layout, browser errors, and request failures. Phase 1 evidence covers
supported desktop and phone viewport sizes, keyboard and touch input, and the
browser engines named by the accepted story.

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
begins. Conversation evaluations and deterministic tests should cite the stable
story ID from [USER_STORIES.md](USER_STORIES.md).

### Physical Watch

The simulator is useful but insufficient. Phase 3 requires Andrew's physical
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
without the phone with the same canonical Friend used on the web.

The Phase 0 simulator-readiness shell has its own unsigned test and build
commands in [../apps/watch/README.md](../apps/watch/README.md). Passing them
proves only that the independent target and idle-state contract compile; it does
not satisfy any physical Watch or live-conversation acceptance criterion.

## Story traceability

Every implementation plan names one or more accepted story IDs. Focused tests,
conversation evaluations, and manual evidence cite the same IDs so a reviewer
can trace:

```text
story -> acceptance criterion -> test or scenario -> current evidence
```

A phase heading, feature name, or architecture direction is not enough to
authorize implementation. When an acceptance criterion changes materially,
update the story first and record the decision in the relevant plan.

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
