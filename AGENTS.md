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
