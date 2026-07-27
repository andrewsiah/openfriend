# Public Codebase Harness Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make OpenFriend's public repository security, architecture, browser
feedback, maintenance, and contributor expectations mechanically verifiable
before code reaches `main`.

**Architecture:** Extend the existing `pnpm verify` and GitHub ruleset rather
than introducing a second quality system. Deterministic local scripts own
repository invariants and maintenance reporting; GitHub supplies free
public-repository security scanning; a browser harness drives the real
conversation component through its existing injectable `LiveSession` boundary
without credentials or external network calls.

**Tech Stack:** Node.js test runner, pnpm, Next.js, React, TypeScript, Playwright,
GitHub Actions, Dependabot, CodeQL, Greptile.

---

### Task 1: Establish the isolated baseline and durable plan

**Files:**

- Create: `docs/plans/2026-07-26-public-codebase-harness.md`
- Modify: `docs/PLANS.md`

**Step 1: Preserve the existing teardown policy**

Replay commit `49bbf0f` onto a branch based on current `origin/main`, resolving
the documentation overlap without losing current `main` guidance.

**Step 2: Run the baseline gate**

Run: `pnpm install --frozen-lockfile && pnpm verify`

Expected: all tests, static checks, documentation checks, and builds pass.
Record any warning that makes worktree output ambiguous.

**Step 3: Index the plan**

Add this plan to `docs/PLANS.md` as an active harness plan.

**Step 4: Commit**

```bash
git add AGENTS.md docs/TESTING.md docs/PLANS.md \
  docs/plans/2026-07-26-public-codebase-harness.md
git commit -m "docs: plan the public codebase harness"
```

### Task 2: Add and enable the public-repository security baseline

**Files:**

- Create: `.github/dependabot.yml`
- Create: `.github/workflows/dependency-review.yml`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/SECURITY.md`
- Modify: `docs/QUALITY_SCORE.md`

**Step 1: Add configuration validation**

Add focused repository tests that parse the Dependabot and workflow files and
assert:

- weekly grouped updates cover `pnpm` and `github-actions`;
- dependency review runs only for pull requests with read-only contents access;
- CI uses current Node 24-compatible action majors;
- the dependency-review check is named deterministically.

Run the focused test and confirm it fails because the new files and versions are
missing.

**Step 2: Add the minimal configuration**

Use weekly grouped updates with a cooldown for routine version updates. Add a
PR-only dependency review job that fails on moderate-or-higher newly introduced
vulnerabilities. Upgrade first-party Actions to current supported majors.

**Step 3: Verify locally**

Run the focused configuration tests, then `pnpm verify`.

Expected: all checks pass without weakening existing CI or Greptile gates.

**Step 4: Enable live GitHub security features**

Using Andrew's personal `andrewsiah/openfriend` repository only:

- enable Dependabot alerts;
- enable Dependabot security updates;
- enable CodeQL default setup;
- enable private vulnerability reporting if supported.

Do not add a new required status check until its exact successful check context
has been observed on the pull request.

**Step 5: Commit**

```bash
git add .github scripts docs/SECURITY.md docs/QUALITY_SCORE.md
git commit -m "ci: add public repository security checks"
```

### Task 3: Enforce architecture invariants

**Files:**

- Create: `scripts/check-architecture.mjs`
- Create: `scripts/check-architecture.test.mjs`
- Modify: `package.json`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/TESTING.md`

**Step 1: Write one failing fixture test per invariant**

Use temporary synthetic repository trees. Assert actionable failures for:

- a package importing implementation from `apps/`;
- `packages/contracts` importing React, Next.js, Node built-ins, or application
  code;
- a browser module importing a server-only module or referencing a named secret;
- the deprecated `gpt-realtime-mini` model identifier.

Also test representative allowed imports. Run:

```bash
node --test scripts/check-architecture.test.mjs
```

Expected: fail because the checker does not exist.

**Step 2: Implement the smallest repository-aware checker**

Return one diagnostic per violation containing the relative path, rule name,
and a concrete remediation. Do not build a generalized dependency graph or
invent boundaries absent from `docs/ARCHITECTURE.md`.

**Step 3: Add it to the integrated gate**

Add `architecture:check` and run it from `pnpm verify`.

**Step 4: Verify and document**

Run the focused tests, `pnpm architecture:check`, and `pnpm verify`.

**Step 5: Commit**

```bash
git add scripts/check-architecture.mjs scripts/check-architecture.test.mjs \
  package.json docs/ARCHITECTURE.md docs/TESTING.md
git commit -m "test: enforce architecture invariants"
```

### Task 4: Add the deterministic browser harness

**Files:**

- Modify: `apps/web/components/live-conversation-lab.tsx`
- Create: `apps/web/tests/browser/mock-live-session.ts`
- Create: `apps/web/tests/browser/harness-page.tsx`
- Create: `apps/web/tests/browser/harness.html`
- Create: `apps/web/tests/browser/live-conversation.spec.ts`
- Create: `apps/web/playwright.config.ts`
- Modify: `apps/web/package.json`
- Modify: `apps/web/next.config.ts`
- Modify: `.gitignore`
- Modify: `.github/workflows/ci.yml`
- Modify: `docs/TESTING.md`

**Step 1: Test the mock session contract first**

Write a focused test that proves the deterministic session emits connected
state, transcript history, speech-stop/response-start timing, interruption, and
idempotent close. Confirm it fails before implementing the mock.

**Step 2: Implement the deterministic session**

Implement only the production `LiveSession` contract. Do not call the Realtime
API, request microphone access, or require an API key.

**Step 3: Write the failing browser story**

Drive the real `LiveConversationLab` component through a test-only Vite page:

- choose a profile;
- start and observe deterministic live status/transcript/latency;
- interrupt;
- end and reset;
- verify clean session closure;
- verify a deterministic connection failure reaches the honest failed state.

Confirm the Playwright test fails before completing the harness.

**Step 4: Add a worktree-safe runner**

Use an OS-assigned or explicitly supplied loopback port. Keep server logs,
screenshots, traces, and browser output in ignored `test-results/` paths. Capture
artifacts on failure and always close the page, context, browser, mock session,
and child server in `finally`.

Set `turbopack.root` explicitly so nested worktree builds do not emit an
incorrect workspace-root warning.

**Step 5: Add CI and documentation**

Install Chromium in CI, run the deterministic browser smoke test after the fast
gate, and keep the real synthetic Realtime command manual and explicitly
billable.

**Step 6: Verify**

Run focused mock tests, `pnpm test:browser`, and `pnpm verify`.

**Step 7: Commit**

```bash
git add apps/web .github/workflows/ci.yml .gitignore pnpm-lock.yaml \
  docs/TESTING.md
git commit -m "test: add deterministic browser harness"
```

### Task 5: Add a report-only maintenance loop

**Files:**

- Create: `scripts/maintenance-report.mjs`
- Create: `scripts/maintenance-report.test.mjs`
- Create: `scripts/maintenance-baseline.json`
- Create: `.github/workflows/maintenance-report.yml`
- Modify: `package.json`
- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/TESTING.md`

**Step 1: Write failing detector tests**

Use temporary fixture repositories to prove deterministic reporting for:

- TODO, FIXME, skipped, and focused test markers;
- oversized source and test files using documented warning thresholds;
- required documentation and security workflow presence;
- stale or missing core-document review dates from the maintenance baseline;
- rapid file growth only when both 100-line and 25-percent thresholds are met;
- dependency-manifest, pnpm lockfile, pnpm 10, Dependabot, and dependency-review
  health; and
- stale, Pending, invalid, blank, or internally contradictory quality-score
  evidence signals.

The report is informational: findings do not fail the main quality gate.

**Step 2: Implement deterministic Markdown output**

Include a generated timestamp only when explicitly supplied, stable sorting,
counts, paths, and remediation. Exclude dependencies, generated output,
worktrees, and test artifacts. Store reviewed core-document dates and line
counts for substantial tracked source and test files in
`scripts/maintenance-baseline.json`; historical plan and evidence dates are not
core-document freshness signals.

**Step 3: Add the least-privilege schedule**

Run weekly and through `workflow_dispatch`, with `contents: read`. Write Markdown
to the Actions step summary and upload it with short retention. Do not grant
issue, pull-request, or contents-write permission. Invoke the Node report script
directly so the summary and artifact contain only deterministic Markdown.

**Step 4: Verify**

Run focused tests, generate a local report directly with Node, validate workflow
configuration, and run `pnpm verify`. The frozen-lock workflow install is the
live lockfile-consistency check; provider alerts remain authoritative for
known vulnerabilities.

**Step 5: Commit**

```bash
git add scripts/maintenance-report.mjs scripts/maintenance-report.test.mjs \
  scripts/maintenance-baseline.json \
  .github/workflows/maintenance-report.yml package.json docs
git commit -m "chore: add weekly quality maintenance report"
```

### Task 6: Add proportionate public governance

**Files:**

- Modify: `CONTRIBUTING.md`
- Modify: `SECURITY.md`
- Modify: `CODE_OF_CONDUCT.md`
- Modify: `README.md`
- Modify: `docs/README.md`
- Modify: `scripts/check-docs.mjs`
- Modify: `scripts/check-docs.test.mjs`

**Step 1: Write failing documentation checks**

Require the existing contributor guide, GitHub-recognized root security policy,
and code of conduct. Verify all relative links, required guidance, and reject
placeholder reporting contacts.

**Step 2: Add the minimal documents**

- Contributor workflow: accepted stories, TDD, `pnpm verify`, deterministic
  browser test, Greptile, synthetic public data, and personal account boundary.
- Security policy: supported `main`, private GitHub vulnerability reporting,
  no public disclosure of suspected secrets, and response expectations without
  unsupported guarantees.
- Contributor Covenant with the existing private maintainer contact for conduct
  enforcement.

Do not add CODEOWNERS, DCO, signed commits, automatic releases, or mandatory
human approval for the solo-maintainer phase.

**Step 3: Verify**

Run documentation tests, `pnpm docs:check`, placeholder/secret searches, and
`pnpm verify`.

**Step 4: Commit**

```bash
git add CONTRIBUTING.md CODE_OF_CONDUCT.md SECURITY.md README.md \
  docs/README.md scripts/check-docs.mjs scripts/check-docs.test.mjs
git commit -m "docs: add public contribution governance"
```

### Task 7: Publish, prove, and enforce the complete harness

**Files:**

- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/PLANS.md`

**Step 1: Audit the complete change**

Inspect every tracked and untracked file. Search for credentials, personal data,
private conversations, provider identifiers, and populated connection strings.
Run a practical secret scanner.

**Step 2: Run fresh integrated verification**

Run:

```bash
pnpm test:browser
pnpm maintenance:report
pnpm verify
```

Expected: all required checks pass; the maintenance report may contain
informational findings.

**Step 3: Obtain focused high-effort review**

Review the complete diff for security, architecture, browser teardown,
least-privilege workflows, and agreement between docs and actual enforcement.
Fix every critical or important finding and rerun affected checks.

**Step 4: Push and open the pull request**

Push `andrew/high-quality-harness`, create a ready pull request, and wait for
CI, dependency review, CodeQL, and Greptile to finish.

**Step 5: Extend the ruleset only from observed evidence**

After the pull request proves the exact dependency-review check context and
source App ID, add it to ruleset `19789735` without removing `verify` or
`Greptile Review`. CodeQL findings remain a security gate through GitHub's merge
protection; do not guess a status context.

**Step 6: Resolve reviews and merge**

Address actionable feedback, resolve conversations, rerun stale checks, and
merge only when the pull request is clean.

**Step 7: Verify external completion**

Re-query:

- Dependabot alerts and security updates;
- CodeQL default setup and latest analysis;
- private vulnerability reporting;
- the active ruleset and required checks;
- post-merge CI on `main`;
- the scheduled maintenance workflow.

Record exact evidence in `docs/QUALITY_SCORE.md`, mark this plan complete in
`docs/PLANS.md`, and merge that evidence through the same gate if it requires a
follow-up commit.

## Completion evidence

Completed on 2026-07-27.

- Pull request [#4](https://github.com/andrewsiah/openfriend/pull/4) merged
  through active ruleset `19789735` as commit
  `a64ea88e0b5031f1761669be50c0c87fcb4a2f5f`.
- Exact pull-request head
  `0d144103e4ceb37e216739362936323af55dd1c7` passed `verify` run
  `30246204601`, Dependency Review run `30246204615`, CodeQL run
  `30246201827`, and Greptile at `5/5`.
- The active ruleset requires current `verify`, `Greptile Review`, and
  `Dependency Review` checks from their observed GitHub Apps, requires resolved
  conversations and current `main`, and has no bypass actors.
- GitHub vulnerability alerts, automated security fixes, private vulnerability
  reporting, and CodeQL default setup are enabled in Andrew's personal
  repository.
- Five inherited advisories closed after safe dependency floors. One
  `brace-expansion` advisory remains visible in the development ESLint chain
  because forcing the incompatible major breaks current plugins; Dependabot
  updater run `30247197846` independently confirmed that the fixed major is not
  resolvable through the current dependency graph.
- Post-merge CI run `30247191259` passed on `main`.
- Post-merge CodeQL run `30247190869` passed on `main` for Actions,
  JavaScript/TypeScript, and Swift.
- The first read-only maintenance dispatch, run `30247210867`, succeeded in 26
  seconds and produced the expected pure-Markdown summary and artifact.
- Local completion checks passed: 50 repository tests, 6 contract tests, 60 web
  tests, 4 deterministic browser stories, typecheck, lint, formatting,
  documentation, architecture, and production build.
- A dedicated secret-scanner executable was unavailable. The complete public
  diff received a targeted credential-pattern inspection; the only token-like
  value was explicitly synthetic browser-harness data.
