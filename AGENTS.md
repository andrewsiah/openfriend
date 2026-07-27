# OpenFriend agent guide

OpenFriend is a personal-first, open-source, full-duplex companion for Apple Watch and web. The product is the relationship plus trustworthy action—not a voice command parser.

## Start here

Read [docs/README.md](docs/README.md) before changing anything. It maps the repository's product, architecture, engineering, testing, security, reliability, user-story, and planning guidance.

## Working rules

1. Start product changes from an accepted story and observable criteria.
2. Use TDD for behavior: one focused failing test, the smallest passing
   implementation, then refactor while green.
3. Apply YAGNI. Do not add speculative providers, platforms, abstractions, or
   infrastructure.
4. Keep the live companion responsive; delegate deep work to the operator.
5. Claim external completion only after the source system confirms it.
6. Keep secrets server-side and out of Git, prompts, logs, browser bundles, and Watch storage.
7. Follow [docs/TESTING.md](docs/TESTING.md) before claiming completion,
   including browser/voice teardown, and record evidence in `docs/`.
8. Preserve existing user work. Keep commits narrow and intentional.

## Orchestration and delegation

The active interface sets the user-facing coordinator:

- In Codex Desktop, the primary Codex task is the orchestrator.
- In Claude Code, Claude is the conversational orchestrator and delegates
  execution to Codex.

For substantial plans and high-leverage reviews, consult Fable/high first. If
its usage limit is reached, try Opus 5/high. If that limit is also reached, note
the fallback and proceed with Codex. Codex remains the primary executor and
owns investigation, implementation, commands, tests, fixes, and verification.

The active orchestrator preserves intent and integrates evidence. Identify
independent workstreams early. Bound every delegated task by goal, scope,
safety constraints, verification, return summary, and stop point. Delegation
never expands authority; treat reports as evidence, inspect repository state,
and run the integrated gate. Do not create recursive delegation loops or enable
the automatic Codex review gate unless Andrew asks.

If Codex itself is blocked, report the constraint and agree on a fallback.
See [docs/ENGINEERING.md](docs/ENGINEERING.md) and [CLAUDE.md](CLAUDE.md) for
the full workflow.

## Public repository and secrets

Treat every commit, branch, PR, issue, artifact, and CI log as permanently public.

- Never expose credentials, `.env` files, local provider state, populated
  connection strings, personal data, private conversations, or production payloads.
- Store credentials in Stripe Projects, provider secret stores, or an approved
  local store; commit only variable names, placeholders, and synthetic data.
- Before staging or pushing, inspect the complete diff and untracked files for
  sensitive material and run an available secret scanner when practical.
- If exposure is possible, stop, tell Andrew, rotate first, then coordinate
  history removal; a later deletion is insufficient.

Follow [docs/SECURITY.md](docs/SECURITY.md) for the complete policy.

## Personal account boundary

Use only Andrew's personal GitHub, Stripe, Vercel, Supabase, Apple, and other
provider accounts. Never use Ready Homes or another company account. Ambiguous
ownership blocks external changes.

<!-- stripe-projects-cli managed:agents-md:start -->

## Stripe Projects CLI

This repository is initialized for the Stripe project "openfriend".

## Tools used

- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the `projects` plugin to manage third-party services, credentials, and deployments for this project. Use the stripe-projects-cli to manage deploying and access to third party services.

<!-- stripe-projects-cli managed:agents-md:end -->
