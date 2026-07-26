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
