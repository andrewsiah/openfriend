# Dependabot Review Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Dependabot updates enter the same real Greptile-protected merge
path as every other pull request and triage incompatible majors without hiding
security updates.

**Architecture:** Remove the live Greptile author exclusion at its source, keep
the GitHub ruleset unchanged, keep security-relevant majors visible, and verify
the integrated behavior on real pull requests.

**Tech Stack:** Greptile GitHub App, GitHub repository rulesets, Dependabot,
Node.js test runner, YAML, pnpm.

---

### Task 1: Prove and repair the provider trigger

**Files:**

- Create: `docs/plans/2026-07-27-dependabot-review-loop-design.md`
- Create: `docs/plans/2026-07-27-dependabot-review-loop.md`
- Modify: `docs/README.md`
- Modify: `docs/PLANS.md`

**Steps:**

1. Confirm human-authored pull requests receive `Greptile Review` while current
   Dependabot pull requests do not.
2. Try a human `@greptileai` trigger on one passing Dependabot pull request and
   observe whether the exact check appears.
3. Inspect the personal Greptile organization settings without exposing
   secrets.
4. Remove only the `dependabot[bot]` author exclusion and reload the page to
   prove persistence.
5. Retrigger the passing pull request and require the real Greptile App check
   before treating the provider fix as complete.
6. If the existing pull request remains filtered, make the all-author repository
   policy explicit with `includeAuthors: ["*"]`, protect it with a configuration
   test, and repeat the live proof without weakening the required gate.
7. If Greptile still does not start on a native Dependabot pull request, promote
   the exact dependency commit to a human-owned pull request. Require the real
   Greptile App check there; do not synthesize or bypass the protected check.

### Task 2: Protect security-relevant major visibility with TDD

**Files:**

- Modify: `scripts/github-config.test.mjs`
- Modify: `.github/dependabot.yml`

**Steps:**

1. Add a focused configuration test preventing TypeScript and ESLint
   semver-major ignore rules.
2. Run `node --test scripts/github-config.test.mjs` and confirm the focused test
   fails against the initially proposed ignore configuration.
3. Remove the unsafe ignore entries and document why majors remain visible.
4. Re-run the focused test and `pnpm verify`; expect both to pass.

### Task 3: Publish through the protected path

**Files:**

- Modify: `docs/plans/2026-07-27-dependabot-review-loop.md`
- Modify: `docs/PLANS.md`

**Steps:**

1. Inspect the complete diff and untracked files for secrets.
2. Commit and push `andrew/dependabot-greptile-loop`.
3. Open a ready pull request and require `verify`, `Dependency Review`, and the
   exact Greptile App check.
4. Resolve actionable review findings, rerun the integrated gate, and merge only
   through the active ruleset.
5. Confirm `main` contains the merge and its required checks remain active.

### Task 4: Triage current Dependabot pull requests

**Files:**

- Modify: `docs/plans/2026-07-27-dependabot-review-loop.md`
- Modify: `docs/PLANS.md`

**Steps:**

1. Close the failing TypeScript and ESLint major pull requests with concise,
   public compatibility reasons after the review policy reaches `main`.
2. Close the Node type major because the repository and CI still target Node 22;
   keep the major visible rather than hiding future security updates.
3. Recreate the passing jsdom pull request after the all-author policy reaches
   `main`.
4. If Greptile still does not start on that bot-owned pull request, promote its
   exact commit to a human-owned pull request and require all normal checks.
5. Merge the promoted update only if all required checks pass and the version is
   compatible with the repository runtime; close the bot pull request as
   superseded only after the protected merge succeeds.
6. Record the final provider and pull-request evidence below and move this plan
   to Completed.

## Review fallback

The required Fable/high review was attempted and stopped at the account usage
limit. Opus/high reviewed the design instead. Its key finding was to prove the
manual trigger and exact check identity before adding automation. That
investigation exposed the organization-level Dependabot exclusion, so the
proposed comment workflow was rejected. A subsequent Codex review on PR #10
identified that Dependabot ignore rules can also suppress security updates.
Official GitHub documentation confirmed the behavior, so the proposed
TypeScript and ESLint ignores were removed.

## Evidence

- Baseline `pnpm verify` passed from clean `origin/main` commit `349abdd`.
- Greptile organization settings persisted with `dependabot[bot]` removed and
  `renovate[bot]` retained.
- PR #6 was recreated twice after the dashboard repair, including from merged
  main commit `2b6c45b`; `verify` and `Dependency Review` passed but Greptile did
  not start, including after a fresh human `@greptileai` trigger.
- Repository policy now explicitly includes every author with
  `includeAuthors: ["*"]`, protected by a repository configuration test.
- PR #10 merged as `2b6c45b` after `verify`, `Dependency Review`, and the real
  `Greptile Review` check passed. Its review findings led to keeping dependency
  majors visible so security updates are not suppressed.
- PR #12 merged as `17e1d86` after the same three required checks passed,
  establishing the explicit all-author repository policy.
- TypeScript PR #5 was closed because TypeScript 7 broke 14 architecture
  fixture tests; ESLint PR #8 was closed because `eslint-plugin-react@7.37.5`
  is incompatible with ESLint 10; Node types PR #7 was closed because the
  repository and CI target Node 22 rather than Node 26.
- PR #6 was recreated again from `17e1d86` as head `c9a8915`; `verify` and
  `Dependency Review` ran, but Greptile still did not start on the native bot
  pull request. Its exact commit is being promoted without modification on
  `andrew/jsdom-29-reviewed` for a real Greptile review.
- The promoted pull-request, protected-merge, bot-closure, and final-main
  evidence will be appended during execution.
