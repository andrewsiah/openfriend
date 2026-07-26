# OpenFriend agent guide

OpenFriend is a personal-first, open-source, full-duplex conversational
companion for Apple Watch and web. The product is the quality and continuity of
the relationship plus trustworthy action—not a voice command parser.

## Start here

Read [docs/README.md](docs/README.md) before making changes. It is the map to the
repository's product, architecture, engineering, testing, security,
reliability, user-story, and planning guidance.

## Working rules

1. Start every product change from an accepted user story and observable
   acceptance criteria.
2. Use test-driven development for behavior: write one focused failing test,
   make it pass with the smallest implementation, then refactor while green.
3. Apply YAGNI. Do not add speculative providers, platforms, abstractions, or
   infrastructure.
4. Keep the live companion responsive; delegate deeper work to the background
   operator.
5. Never claim an external action completed until its source system confirms
   completion.
6. Keep secrets server-side and out of Git, prompts, logs, browser bundles, and
   durable Watch storage.
7. Run the checks documented in [docs/TESTING.md](docs/TESTING.md) before
   claiming completion, and record durable decisions or evidence in `docs/`.
8. Preserve user work already present in the tree. Keep commits narrow and
   intentional.

## Orchestration and delegation

The primary Codex task is the user-facing orchestrator. It owns the integrated
plan, stays in conversation with Andrew, and is accountable for the final
result.

- Before executing multi-step work sequentially, identify independent
  workstreams that can run in parallel.
- Delegate independent work to parallel agent tasks whenever scopes can be made
  concrete and non-overlapping. Keep tightly coupled changes local.
- Give each agent a bounded goal, file or system scope, safety constraints,
  expected verification, and required return summary.
- Delegation never expands authority. External mutations, secrets, destructive
  actions, and account boundaries remain governed by the original user request.
- The orchestrator reviews every returned change, checks for conflicts, and
  runs the integrated quality gate. Agent reports are evidence, not completion.

Use Andrew's installed Claude CLI for first-pass plans and high-leverage
architecture or code reviews when practical. Keep Claude read-only for reviews,
send only the context it needs, and never expose secrets. Treat its output as a
second opinion; the Codex orchestrator still makes and verifies the decision.
If Claude is unavailable, rate-limited, over budget, or otherwise blocked,
continue with Codex reasoning rather than pausing the project.

## Personal account boundary

This is Andrew's personal project. Use only personal GitHub, Stripe, Vercel,
Supabase, Apple, and other provider accounts. Never create, link, deploy, or
store OpenFriend data in Ready Homes or another company account. If ownership
is ambiguous, stop before changing external state.

<!-- stripe-projects-cli managed:agents-md:start -->

## Stripe Projects CLI

This repository is initialized for the Stripe project "openfriend".

## Tools used

- [Stripe CLI](https://docs.stripe.com/stripe-cli) with the `projects` plugin to manage third-party services, credentials, and deployments for this project. Use the stripe-projects-cli to manage deploying and access to third party services.

<!-- stripe-projects-cli managed:agents-md:end -->
