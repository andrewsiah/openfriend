# Engineering method

OpenFriend uses user-story-driven development, test-driven development, and
YAGNI as working constraints rather than slogans.

## Start with a user story

Every product change states:

> As [a specific person in a situation], I can [observable behavior], so that
> [real outcome].

Add acceptance criteria that a person or automated check can observe. Prefer a
thin vertical story that exercises a real surface over a horizontal
infrastructure project.

Plans and pull requests name the story they advance and the evidence that proves
it works.

## Use red, green, refactor

For production behavior:

1. Write one focused test describing the next behavior.
2. Run it and confirm it fails for the expected reason.
3. Add the smallest implementation that makes it pass.
4. Run the focused test and relevant suite.
5. Refactor only while the suite remains green.

If production code is written before its test, remove it and begin again from
the failing test. Disposable spikes, generated code, and configuration may be
exceptions, but the relevant plan must say so.

See [TESTING.md](TESTING.md) for layers and commands.

## Apply YAGNI

Do not build a feature, abstraction, provider, platform, service, or scale
mechanism for a hypothetical future. Add an extension point only when it keeps
today's implementation smaller or supports the next scheduled phase.

Examples:

- two profile records do not require a plugin framework;
- one user does not require organization management;
- Phase 0 does not require a database;
- the Watch does not wait for calendar connectors;
- queues and observability vendors arrive when a tested workload needs them.

## Prefer supported infrastructure

Use official SDKs and widely adopted maintained libraries. Reuse Vercel,
Supabase, Stripe Projects, Apple frameworks, and provider capabilities before
creating custom infrastructure. Pin dependencies through the lockfile and keep
the production dependency surface narrow.

## Personal infrastructure boundary

OpenFriend belongs only to Andrew's personal accounts:

- personal GitHub user;
- personal Stripe account and project;
- personal Vercel scope;
- personal Supabase organization/project;
- personal Apple Developer membership.

Ready Homes and every other company organization are prohibited. Verify the
resolved owner before creating, linking, deploying, migrating, or deleting an
external resource. Ambiguous ownership is a blocker.

## Orchestrator-led execution

Andrew interfaces with one primary Codex task. That task acts as the
orchestrator: it owns the current plan, decomposes work, keeps the user informed,
integrates results, and verifies the finished experience.

Parallel work is the default when tasks are genuinely independent. Good
delegation candidates include separate provider-readiness audits, bounded
documentation or CI work, independent platform scaffolds, focused tests, and
reviews. Keep work sequential when tasks edit the same contract, depend on an
unresolved decision, share mutable external state, or could race on an account.

Every delegated task states:

- one concrete outcome;
- the allowed file or provider scope;
- non-goals and safety boundaries;
- the evidence it must produce;
- whether it may edit, commit, or mutate external state.

The orchestrator reviews returned diffs and evidence, resolves overlaps, and
runs the complete integrated gate. Delegated work is never accepted solely
because another agent says it passed.

### Claude as a planning and review peer

Use Andrew's installed Claude CLI for an early second opinion on multi-step
plans and for high-leverage architecture, security, and code reviews when the
expected value justifies its higher cost.

- Prefer a read-only or plan permission mode.
- Provide the narrowest relevant files and question.
- Set a reasonable effort and budget for non-interactive calls.
- Never include credentials, private conversations, or unrelated personal data.
- Treat findings as advisory and verify them against the repository and real
  environment.

If Claude is unauthenticated, unavailable, rate-limited, over its usage limit,
or times out, note the fallback and proceed with Codex's own review. Claude
availability must not become a delivery dependency.

## Change workflow

1. Read [docs/README.md](README.md) and the relevant product guidance.
2. Add or update the accepted story.
3. Ask Claude for a bounded plan review when practical; fall back without
   blocking if it is unavailable.
4. Write a checked-in plan for multi-step work.
5. Split independent work into bounded parallel tasks.
6. Work on an isolated branch or worktree.
7. Follow red-green-refactor.
8. Review and integrate delegated changes.
9. Run focused checks, then `pnpm verify`.
10. Update docs and quality evidence with the code.
11. Review the diff for secrets, unrelated user changes, and false claims.
12. Commit narrow units and publish through the personal GitHub account.

## Definition of done

A change is done when the accepted experience works repeatedly, its tests and
relevant real-surface checks pass, failure states are honest, docs match
behavior, and the result is reviewable. An API returning success in isolation
is not enough.
