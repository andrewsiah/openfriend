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
7. Follow [docs/TESTING.md](docs/TESTING.md) before claiming completion,
   including its mandatory browser/voice teardown, and record evidence in `docs/`.
8. Preserve user work already present in the tree. Keep commits narrow and
   intentional.

## Orchestration and delegation

The active interface determines the user-facing coordinator:

- In Codex Desktop, the primary Codex task is the orchestrator.
- In Claude Code, Claude Fable at high effort is the conversational
  orchestrator and delegates execution to Codex.

The role split is constant in both cases:

- Fable/high is consulted for first-pass plans and high-leverage architecture,
  product, and code reviews.
- Codex is the primary executor and task runner. It owns repository
  investigation, implementation, command execution, tests, fixes, and
  verification.
- The active orchestrator stays in conversation with Andrew, preserves intent,
  integrates the plan and evidence, and decides what happens next.

Before substantial multi-step implementation, obtain a bounded Fable/high plan.
After implementation, use Fable/high for a focused review when the change
benefits from one. Codex assesses the advice against the repository, implements
accepted changes, and verifies the final result.

- Identify independent workstreams before executing multi-step work
  sequentially.
- Give every delegated task a bounded goal, file or system scope, safety
  constraints, expected verification, required return summary, and explicit
  stop point.
- Delegation never expands authority. External mutations, secrets, destructive
  actions, and account boundaries remain governed by the original user request.
- Treat all agent reports and reviews as evidence, not completion. Inspect the
  actual repository state and run the integrated quality gate.
- Do not create recursive or unbounded delegation loops, and do not enable the
  automatic Codex review gate unless Andrew explicitly asks for it.

If Fable or the Codex integration is unavailable, rate-limited, over budget, or
otherwise blocked, report the constraint and agree on a fallback rather than
silently changing this role split.

## Public repository and secrets

This is a public repository. Treat every commit, branch, tag, pull request,
issue, review comment, artifact, and CI log as permanently visible to anyone on
the internet.

- Never commit or paste API keys, access tokens, passwords, session cookies,
  private keys, certificates, signing material, database credentials, webhook
  secrets, or populated connection strings.
- Never commit `.env` files or local provider state. Commit only sanitized
  examples such as `.env.example`, using placeholder values.
- Keep credentials in Stripe Projects, the provider's secret store, or an
  approved local credential store. Reference environment-variable names in the
  repository, never their values.
- Do not include real personal data, private conversations, production payloads,
  or sensitive logs in source, fixtures, screenshots, documentation, issues, or
  pull requests. Use clearly synthetic examples.
- Before staging or pushing, inspect the complete diff and untracked files for
  sensitive material. Run an available secret scanner when practical.
- If a secret may have been exposed, stop immediately. Tell Andrew, revoke or
  rotate the credential first, and then coordinate removal from Git history.
  Deleting it in a later commit is not sufficient.

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
