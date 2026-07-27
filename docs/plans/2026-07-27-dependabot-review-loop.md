# Dependabot Review Loop Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Dependabot updates enter the same real Greptile-protected merge
path as every other pull request and stop known-incompatible routine majors.

**Architecture:** Remove the live Greptile author exclusion at its source, keep
the GitHub ruleset unchanged, encode only proven major-version exclusions in
Dependabot, and verify the integrated behavior on real pull requests.

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

### Task 2: Encode known-incompatible major policy with TDD

**Files:**

- Modify: `scripts/github-config.test.mjs`
- Modify: `.github/dependabot.yml`

**Steps:**

1. Add a focused configuration test requiring TypeScript and ESLint ignores to
   apply only to `version-update:semver-major`.
2. Run `node --test scripts/github-config.test.mjs` and confirm the focused test
   fails against the current configuration.
3. Add the minimal npm `ignore` entries.
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
   public compatibility reasons after the ignore policy reaches `main`.
2. Re-run or refresh the passing jsdom and Node type pull requests so Greptile
   reviews their current heads.
3. Merge an update only if all required checks pass and the version is
   compatible with the repository runtime; otherwise leave it open with the
   blocking evidence.
4. Record the final provider and pull-request evidence below and move this plan
   to Completed.

## Review fallback

The required Fable/high review was attempted and stopped at the account usage
limit. Opus/high reviewed the design instead. Its key finding was to prove the
manual trigger and exact check identity before adding automation. That
investigation exposed the organization-level Dependabot exclusion, so the
proposed comment workflow was rejected.

## Evidence

- Baseline `pnpm verify` passed from clean `origin/main` commit `349abdd`.
- Greptile organization settings persisted with `dependabot[bot]` removed and
  `renovate[bot]` retained.
- Live pull-request, protected-merge, and final-main evidence will be appended
  during execution.
