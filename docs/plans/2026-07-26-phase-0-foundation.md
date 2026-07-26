# OpenFriend Phase 0 Foundation Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Publish a small, tested, deployable OpenFriend foundation that makes the product direction, personal-account boundary, engineering method, live-model profiles, and Watch-first roadmap unambiguous.

**Architecture:** Use a pnpm TypeScript monorepo with a Next.js App Router web application and a framework-independent contracts package. Keep the Phase 0 runtime intentionally static: it exposes the two accepted Realtime model profiles and a truthful product shell, but does not pretend to establish a voice session before Phase 1. Treat `docs/` as the repository system of record and keep `AGENTS.md` as a short navigation map with the Stripe Projects managed block intact.

**Tech Stack:** Node.js, pnpm workspaces, TypeScript, Next.js 16, React 19, Vitest, Testing Library, ESLint, Prettier, GitHub Actions, Stripe Projects, Vercel, Supabase, SwiftUI in Phase 2.

---

## Scope and user story

Phase 0 advances this story:

> As Andrew and a future contributor, I can open the public OpenFriend
> repository and deployed web shell, understand exactly what is being built,
> choose between the accepted economy and quality Realtime profiles, and run
> the documented quality gates, so that voice and Watch experiments can begin
> from a trustworthy shared foundation.

Acceptance criteria:

- The repository explains that OpenFriend is a full-duplex conversational
  companion and background operator, not a command-oriented listening device.
- The roadmap moves from a web Realtime voice lab directly to an independent
  Apple Watch field test.
- `AGENTS.md` points to durable guidance under `docs/` and records TDD, YAGNI,
  and user-story-driven development.
- A tested shared registry contains `gpt-realtime-2.1-mini` and
  `gpt-realtime-2.1` without using the deprecated `gpt-realtime-mini`.
- The web shell renders the model-profile choice and Watch-first delivery
  sequence without claiming that voice is already connected.
- Local test, typecheck, lint, formatting, documentation, and production-build
  checks pass.
- Stripe Projects is connected only to Andrew's personal resources.
- The Vercel deployment uses Andrew's personal scope.
- The GitHub repository is public, MIT licensed, and pushed under Andrew's
  personal account.

## Non-goals

- No Realtime API call, microphone capture, auth flow, database schema, billing,
  calendar connector, background operator, iPhone app, or Watch app is
  implemented in Phase 0.
- No generic provider abstraction beyond the fields needed by the two accepted
  OpenAI profiles.
- No production resources, paid upgrades, or company-owned provider scopes.
- No secret copied from chat, committed to Git, or printed in a shell command.

## Task 1: Establish the agent-first repository knowledge system

**Files:**

- Modify: `AGENTS.md`
- Modify: `README.md`
- Create: `docs/README.md`
- Create: `docs/PRODUCT.md`
- Create: `docs/ARCHITECTURE.md`
- Create: `docs/ENGINEERING.md`
- Create: `docs/TESTING.md`
- Create: `docs/SECURITY.md`
- Create: `docs/RELIABILITY.md`
- Create: `docs/USER_STORIES.md`
- Create: `docs/PLANS.md`
- Create: `docs/QUALITY_SCORE.md`
- Create: `docs/decisions/README.md`
- Create: `CONTRIBUTING.md`
- Create: `CODE_OF_CONDUCT.md`
- Create: `SECURITY.md`
- Create: `LICENSE`

### Step 1: Write the short repository map

Replace the generated one-purpose `AGENTS.md` with a concise map that:

- defines the product in one paragraph;
- directs agents to `docs/README.md`;
- requires user stories, red-green-refactor, and YAGNI;
- requires verification before completion;
- states the personal-account boundary;
- forbids secrets and false action-completion claims;
- preserves the exact Stripe Projects CLI managed block.

Keep `CLAUDE.md` as a pointer to `AGENTS.md`.

### Step 2: Write the public README

Explain:

- the Samantha-from-_Her_ aspiration without implying affiliation;
- why full-duplex conversation is categorically different from a voice command
  assistant;
- the live companion/background operator split;
- the web-lab-then-Watch delivery sequence;
- current Phase 0 status;
- the economy and quality model profiles;
- local setup and quality commands;
- privacy, contribution, license, and roadmap links.

Do not claim unfinished runtime capabilities.

### Step 3: Split durable guidance across `docs/`

Write focused documents with cross-links:

- `PRODUCT.md`: principles, scope, surfaces, phased roadmap.
- `ARCHITECTURE.md`: runtime boundaries, monorepo layout, transport direction,
  profile registry, and action state machine.
- `ENGINEERING.md`: user-story workflow, TDD, YAGNI, dependency policy, and
  personal infrastructure rule.
- `TESTING.md`: test pyramid, conversation evaluation, web and physical-Watch
  acceptance checks.
- `SECURITY.md`: secrets, short-lived Watch credentials, data ownership,
  approvals, and provider boundaries.
- `RELIABILITY.md`: action truthfulness, idempotency, retries, reconnection,
  degradation, and observability triggers.
- `USER_STORIES.md`: Phase 0 accepted story plus ordered Phase 1 and Phase 2
  stories.
- `PLANS.md`: active/completed plan index and plan lifecycle.
- `QUALITY_SCORE.md`: a lightweight scorecard with evidence fields.
- `decisions/README.md`: when to create an ADR.

### Step 4: Add community and legal basics

Add an MIT license, contribution guide, code of conduct, and public security
reporting policy. Keep them concise and consistent with a one-maintainer
personal project.

### Step 5: Verify documentation structure

Run:

```bash
find . -maxdepth 3 -type f \
  -not -path './.git/*' \
  -not -path './.projects/*' \
  -not -path './node_modules/*' | sort
rg -n "TDD|test-driven|YAGNI|user stor" AGENTS.md README.md docs CONTRIBUTING.md
rg -n "Ready Homes|readyhomes" AGENTS.md README.md docs CONTRIBUTING.md
```

Expected:

- all named files exist;
- engineering-method references are present;
- any company-name match appears only as an explicit prohibition, not as a
  selected account or resource.

### Step 6: Commit

```bash
git add AGENTS.md CLAUDE.md README.md docs CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md LICENSE
git commit -m "docs: establish OpenFriend knowledge system"
```

## Task 2: Add the monorepo and live-model contract with TDD

**Files:**

- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `tsconfig.base.json`
- Create: `.editorconfig`
- Create: `.prettierignore`
- Create: `packages/contracts/package.json`
- Create: `packages/contracts/tsconfig.json`
- Create: `packages/contracts/src/live-model-profile.test.ts`
- Create: `packages/contracts/src/live-model-profile.ts`
- Create: `packages/contracts/src/index.ts`

### Step 1: Create only the workspace test harness

Add root scripts for:

- `dev`
- `build`
- `test`
- `test:watch`
- `typecheck`
- `lint`
- `format`
- `format:check`
- `docs:check`
- `verify`

Add the contracts package with Vitest and TypeScript configured, but do not
create its production implementation.

### Step 2: Write the failing contract tests

Test that:

1. `listLiveModelProfiles()` returns exactly the stable profile IDs
   `economy` and `quality` in that order.
2. Economy maps to `gpt-realtime-2.1-mini`.
3. Quality maps to `gpt-realtime-2.1`.
4. Every profile declares full-duplex audio, interruption, and tool-use
   capabilities.
5. `getLiveModelProfile()` returns a known profile and rejects an unknown ID.
6. No model identifier equals deprecated `gpt-realtime-mini`.

### Step 3: Run the test and observe RED

Run:

```bash
pnpm install
pnpm --filter @openfriend/contracts test
```

Expected: FAIL because `live-model-profile.ts` does not exist or does not export
the required behavior.

### Step 4: Implement the smallest profile registry

Add:

- a literal `LiveModelProfileId` union;
- a `LiveModelProfile` interface containing only the fields used by Phase 0;
- two immutable profile records;
- `listLiveModelProfiles()`;
- `getLiveModelProfile()` with a clear error for an unknown ID.

Do not add a provider plugin system.

### Step 5: Run focused and package checks

Run:

```bash
pnpm --filter @openfriend/contracts test
pnpm --filter @openfriend/contracts typecheck
```

Expected: PASS.

### Step 6: Commit

```bash
git add package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json .editorconfig .prettierignore packages/contracts
git commit -m "feat: define realtime model profiles"
```

## Task 3: Build the truthful web shell with TDD

**Files:**

- Create: `apps/web/package.json`
- Create: `apps/web/next.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/eslint.config.mjs`
- Create: `apps/web/vitest.config.ts`
- Create: `apps/web/vitest.setup.ts`
- Create: `apps/web/app/layout.tsx`
- Create: `apps/web/app/page.test.tsx`
- Create: `apps/web/app/page.tsx`
- Create: `apps/web/app/globals.css`
- Create: `apps/web/components/live-profile-selector.test.tsx`
- Create: `apps/web/components/live-profile-selector.tsx`
- Create: `apps/web/public/openfriend-mark.svg`

### Step 1: Configure the Next.js test harness

Add a Next.js 16 App Router application with React 19, Testing Library, jsdom,
Vitest, ESLint, and the workspace contracts dependency. Do not generate example
routes or API handlers.

### Step 2: Write the failing page and selector tests

The tests must prove:

- the page identifies OpenFriend as a full-duplex conversational companion;
- the page says the web voice lab comes before the Watch field test;
- the page marks voice as not yet connected rather than simulating success;
- the model selector exposes Economy and Quality;
- Economy is selected initially;
- selecting Quality updates the visible model identifier.

### Step 3: Run the tests and observe RED

Run:

```bash
pnpm --filter @openfriend/web test
```

Expected: FAIL because the page and selector implementations are absent.

### Step 4: Implement the smallest shell

Create a distinctive but restrained interface:

- nocturnal blue-black canvas;
- warm amber conversational presence;
- editorial typography;
- generous negative space;
- a live-profile selector with plain-language cost/quality framing;
- a clear `Foundation ready · Voice not connected` state;
- web voice lab followed directly by Watch field test;
- no fake waveform, transcript, microphone permission, or API call.

Use semantic HTML, keyboard-accessible controls, visible focus, reduced-motion
support, and responsive layout.

### Step 5: Run focused checks

Run:

```bash
pnpm --filter @openfriend/web test
pnpm --filter @openfriend/web typecheck
pnpm --filter @openfriend/web lint
pnpm --filter @openfriend/web build
```

Expected: PASS.

### Step 6: Apply React review guidance

Read and apply `vercel:react-best-practices` to edited TSX files. Re-run the
focused checks after any changes.

### Step 7: Commit

```bash
git add apps/web package.json pnpm-lock.yaml
git commit -m "feat: add OpenFriend web foundation"
```

## Task 4: Add mechanical repository quality gates

**Files:**

- Create: `scripts/check-docs.mjs`
- Create: `scripts/check-docs.test.mjs`
- Create: `.github/workflows/ci.yml`
- Create: `.github/ISSUE_TEMPLATE/bug_report.yml`
- Create: `.github/ISSUE_TEMPLATE/feature_request.yml`
- Create: `.github/pull_request_template.md`
- Modify: `package.json`
- Modify: `docs/QUALITY_SCORE.md`

### Step 1: Write a failing docs-check test

Test that the checker reports:

- a missing required system-of-record document;
- a broken relative Markdown link;
- an overgrown `AGENTS.md` beyond the documented line budget.

### Step 2: Run the test and observe RED

Run:

```bash
node --test scripts/check-docs.test.mjs
```

Expected: FAIL because the checker does not exist.

### Step 3: Implement the smallest checker

Validate only:

- the required docs list;
- relative Markdown file links;
- the `AGENTS.md` line budget.

Do not build a general Markdown linter.

### Step 4: Add CI and templates

Configure GitHub Actions to install the pinned pnpm version and run
`pnpm verify`. Add user-story and verification prompts to the pull-request
template.

### Step 5: Verify and commit

Run:

```bash
node --test scripts/check-docs.test.mjs
pnpm docs:check
pnpm verify
```

Expected: PASS.

```bash
git add scripts .github package.json docs/QUALITY_SCORE.md
git commit -m "ci: enforce foundation quality gates"
```

## Task 5: Record and verify personal Stripe Projects infrastructure

**Files:**

- Modify: `.gitignore`
- Modify: `AGENTS.md` only through Stripe Projects managed commands if needed
- Commit: `.agents/`, `.claude/`, `.cursor/`, `.cursorignore`,
  `skills-lock.json`, and safe Stripe Projects metadata selected by the CLI
- Create: `docs/INFRASTRUCTURE.md`
- Create: `.env.example`

### Step 1: Refresh required Stripe Projects context

Run without reading `.projects` files:

```bash
stripe projects llm-context
stripe projects status --json
stripe projects catalog supabase --json
stripe projects catalog vercel --json
```

Use exact service slugs from catalog output. Never guess a slug and never open
`.projects` or environment files directly.

### Step 2: Document the boundary before provisioning

Record:

- Stripe account: Andrew's personal account;
- Vercel scope: `andrewsiahs-projects`;
- prohibited Vercel scopes: Ready Homes and other company teams;
- existing Supabase CLI scope is company-only and must not be used;
- Supabase must be newly created under Andrew's personal ownership through the
  Stripe Projects flow;
- OpenAI is not in the Stripe Projects catalog, so a freshly rotated key will
  later be stored as a project variable without exposing it in Git or shell
  history.

The `.env.example` contains names and comments only.

### Step 3: Provision only free development resources

Use the exact catalog services to create or link:

- a Vercel project under `andrewsiahs-projects`;
- a new personal Supabase project with database, auth, and storage.

If any flow proposes a company scope, paid upgrade, production environment, or
ambiguous owner, stop before confirmation and ask Andrew.

### Step 4: Verify ownership and safe status

Use CLI/API status output to verify the service names, project IDs, environment,
and personal owner. Do not reveal credential values.

### Step 5: Commit only safe project state

Run:

```bash
git status --short
git diff --check
```

Stage safe generated configuration and documentation. Do not force-add ignored
vault, cache, environment, or secret files.

```bash
git commit -m "chore: configure personal project services"
```

## Task 6: Deploy and verify the web foundation

**Files:**

- Modify only deployment configuration created by the verified Vercel link
- Modify: `docs/QUALITY_SCORE.md`
- Modify: `README.md`

### Step 1: Link the application to personal Vercel

Use Stripe Projects or Vercel CLI status to confirm the linked scope is
`andrewsiahs-projects` before deployment.

### Step 2: Deploy a preview

Deploy the `apps/web` production build without adding unused environment
variables.

### Step 3: Verify the deployed user story

Check in a real browser at desktop and Watch-like narrow widths:

- product identity;
- foundation/voice state truthfulness;
- both live profiles and selection behavior;
- phase order;
- no horizontal overflow;
- keyboard focus and basic accessibility;
- console and request errors.

### Step 4: Update evidence and commit

Record the preview URL and dated evidence in `docs/QUALITY_SCORE.md`. Add the
deployment link to the README only if it is intended to remain stable.

```bash
git commit -am "docs: record deployed foundation evidence"
```

## Task 7: Publish the public personal GitHub repository

**Files:**

- No new product files expected

### Step 1: Run final verification from a clean state

Run:

```bash
pnpm verify
git diff --check
git status --short
git log --oneline --decorate -8
```

Expected:

- all quality gates pass;
- no secrets or uncommitted product files;
- commits are scoped and understandable.

### Step 2: Confirm personal GitHub identity

Run:

```bash
gh auth status
```

Expected: active personal account `andrewsiah`.

### Step 3: Create and push the public repository

If `andrewsiah/openfriend` does not exist, create it as public with the existing
local repository as source. Set the description to identify it as an
open-source, voice-first personal companion for web and Apple Watch. Push the
foundation branch, then integrate it into `main` using the
`superpowers:finishing-a-development-branch` workflow.

Do not create the repository under any organization.

### Step 4: Verify remote state

Verify:

- repository visibility is public;
- default branch is `main`;
- MIT license is detected;
- README renders;
- CI is running or passing;
- the local remote points to `andrewsiah/openfriend`.

## Completion evidence

Before claiming Phase 0 complete, capture:

- focused RED then GREEN output for contract and web behavior;
- final `pnpm verify` output;
- final production build output;
- personal Stripe/Vercel/Supabase ownership checks without secrets;
- deployed browser verification;
- public GitHub URL and visibility;
- clean Git status.

Do not mark later phases complete. Phase 1 starts with the first failing test for
an ephemeral Realtime session endpoint and browser voice connection state.
