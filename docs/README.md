# OpenFriend knowledge map

This directory is the versioned system of record for OpenFriend. `AGENTS.md`
stays short and points here; durable guidance belongs in the narrowest relevant
document below.

## Product and design

- [PRODUCT.md](PRODUCT.md) — principles, scope, surfaces, and phase sequence.
- [USER_STORIES.md](USER_STORIES.md) — accepted and next user stories with
  observable acceptance criteria.
- [QUALITY_SCORE.md](QUALITY_SCORE.md) — current evidence-based quality
  scorecard.

## Engineering

- [ARCHITECTURE.md](ARCHITECTURE.md) — runtime boundaries, repository shape,
  shared contracts, and action lifecycle.
- [INFRASTRUCTURE.md](INFRASTRUCTURE.md) — personal cloud topology, Stripe
  Projects workflow, and environment-variable names.
- [ENGINEERING.md](ENGINEERING.md) — user-story workflow, TDD, YAGNI,
  dependencies, and account boundaries.
- [TESTING.md](TESTING.md) — local gates, test layers, conversation evaluation,
  and physical Watch matrix.
- [SECURITY.md](SECURITY.md) — data, credentials, approval, and privacy model.
- [RELIABILITY.md](RELIABILITY.md) — truthful actions, retries, reconnection,
  and degraded states.

## Planning and decisions

- [PLANS.md](PLANS.md) — active and completed execution plans.
- [plans/2026-07-26-openfriend-foundation-design.md](plans/2026-07-26-openfriend-foundation-design.md)
  — accepted foundation design.
- [plans/2026-07-26-synthetic-paired-voice-design.md](plans/2026-07-26-synthetic-paired-voice-design.md)
  — accepted design for unattended local Realtime acceptance.
- [plans/2026-07-26-synthetic-paired-voice.md](plans/2026-07-26-synthetic-paired-voice.md)
  — implemented Economy-then-Quality synthetic voice plan.
- [plans/2026-07-26-greptile-merge-gate-design.md](plans/2026-07-26-greptile-merge-gate-design.md)
  — accepted automated-review merge-gate design.
- [plans/2026-07-26-greptile-merge-gate.md](plans/2026-07-26-greptile-merge-gate.md)
  — implementation and live-verification record for the Greptile gate.
- [plans/2026-07-26-public-codebase-harness.md](plans/2026-07-26-public-codebase-harness.md)
  — implemented deterministic browser, architecture, and maintenance checks.
- [plans/2026-07-27-phase-2-watch-conversation-design.md](plans/2026-07-27-phase-2-watch-conversation-design.md)
  — recommended direct WebSocket design for the phone-free Watch slice.
- [plans/2026-07-27-phase-2-watch-conversation.md](plans/2026-07-27-phase-2-watch-conversation.md)
  — bite-sized TDD plan for authentication, PCM audio, interruption, signing,
  and physical field evidence.
- [decisions/README.md](decisions/README.md) — architectural decision record
  policy.

## Public project guidance

- [../README.md](../README.md) — public project introduction.
- [../CONTRIBUTING.md](../CONTRIBUTING.md) — contribution workflow.
- [../CODE_OF_CONDUCT.md](../CODE_OF_CONDUCT.md) — community standards and
  private conduct reporting.
- [../SECURITY.md](../SECURITY.md) — vulnerability reporting.

Update this map whenever a durable document is added, moved, or retired.
