# Plans

Complex work uses checked-in plans so humans and coding agents share the same
scope, acceptance criteria, decisions, and evidence.

## Active

Phase 1 remains active. Its next accepted story is Economy-versus-Quality
comparison:

- [Phase 1 profile comparison](plans/2026-07-26-phase-1-profile-comparison.md)

## Completed

- [Phase 0 foundation implementation](plans/2026-07-26-phase-0-foundation.md)
- [Phase 1 live conversation](plans/2026-07-26-phase-1-live-conversation.md)

## Accepted design

- [OpenFriend foundation design](plans/2026-07-26-openfriend-foundation-design.md)

## Plan lifecycle

1. Begin from an accepted user story.
2. Record goal, architecture, stack, non-goals, exact files, TDD steps, commands,
   expected results, and external-state boundaries.
3. Request a bounded Claude CLI review when practical and resolve actionable
   findings; continue without it when limits or availability block the call.
4. Identify independent workstreams and assign concrete, non-overlapping
   parallel agent tasks.
5. Execute in an isolated branch or worktree.
6. Update progress and decisions in the plan when reality differs.
7. Capture verification evidence in the plan or
   [QUALITY_SCORE.md](QUALITY_SCORE.md).
8. Move the plan link from active to completed; keep the file for provenance.

Plans are not a substitute for tests or current product documentation. When a
decision becomes durable, update the relevant system-of-record document.
