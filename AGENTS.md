# OpenFriend agent guide

OpenFriend is a personal-first, open-source, full-duplex conversational companion
for Apple Watch and web. The product is the quality and continuity of the
relationship plus trustworthy action—not a voice command parser.

## Start here

Read [docs/README.md](docs/README.md) before changing the repository. It maps the
product, architecture, engineering, testing, security, and planning guidance.

## Working rules

1. Start product changes from accepted user stories and observable criteria.
2. Use TDD: focused failing test, smallest passing change, then green refactor.
3. Apply YAGNI; avoid speculative providers, platforms, and abstractions.
4. Keep the live companion responsive; delegate deeper work to the operator.
5. Confirm external actions in their source system before claiming completion.
6. Keep secrets server-side and out of Git, prompts, logs, clients, and Watch.
7. Follow [docs/TESTING.md](docs/TESTING.md), including mandatory browser and
   voice teardown, and record durable evidence.
8. Preserve existing user work and keep commits narrow.

## Orchestration and delegation

- Codex Desktop: the primary Codex task coordinates.
- Claude Code: Claude Fable/high coordinates and delegates execution to Codex.
- In every interface, consult Fable/high for bounded plans and high-leverage
  architecture, product, and code reviews.
- Codex remains the main executor and task runner: investigation, implementation,
  commands, tests, fixes, and verification.
- The coordinator preserves intent and integrates plans, evidence, and next steps.
- Bound delegated work by goal, scope, safety, verification, summary, and stop.
- Delegation never expands authority or account boundaries.
- Inspect repository state and run the integrated gate; reports are only evidence.
- Avoid recursive delegation and automatic review gates unless Andrew asks.
- If either tool is blocked, report it and agree on a fallback.

## Public repository and secrets

This is public. Treat every ref, PR, issue, review, artifact, and CI log as
permanently visible.

- Never commit or paste credentials, tokens, cookies, private keys, certificates,
  signing material, populated connection strings, or webhook secrets.
- Never commit `.env` or provider state; examples must contain placeholders.
- Store credentials in Stripe Projects or approved provider/local secret stores.
- Use synthetic data; exclude private conversations, personal data, production
  payloads, and sensitive logs from all public surfaces.
- Before staging or pushing, inspect the full diff and untracked files; run a
  secret scanner when practical.
- Suspected exposure: stop, tell Andrew, rotate first, then remove from history.

## Personal account boundary

Use only Andrew's personal provider accounts. Never create, link, deploy, or
store OpenFriend data in Ready Homes or another company account. Stop on
ambiguous ownership before changing external state.

<!-- stripe-projects-cli managed:agents-md:start -->

## Stripe Projects CLI

This repository is initialized for the Stripe project "openfriend".

## Tools used

- Use Stripe CLI's `projects` plugin for third-party services, credentials, and
  deployments.

<!-- stripe-projects-cli managed:agents-md:end -->
