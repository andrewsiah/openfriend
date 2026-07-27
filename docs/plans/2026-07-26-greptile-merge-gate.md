# Greptile Merge Gate Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Require a current, passing Greptile review and repository CI before
any pull request can merge to `main`.

**Architecture:** Store review behavior and context in `.greptile/`, keep the
confidence threshold in the personal Greptile organization, and enforce the
observed Greptile and CI check contexts with a GitHub repository ruleset.
Activate enforcement only after a real pull request proves the integration.

**Tech Stack:** Greptile GitHub App, `.greptile/` configuration, GitHub
repository rulesets, GitHub Actions, pnpm.

---

### Task 1: Record the accepted workflow

**Files:**

- Modify: `docs/USER_STORIES.md`
- Create: `docs/plans/2026-07-26-greptile-merge-gate-design.md`
- Modify: `docs/README.md`
- Modify: `docs/PLANS.md`

**Steps:**

1. Record the developer story and observable acceptance criteria.
2. Document the approved strict-gate design, rejected alternatives, and account
   boundary.
3. Add the design and implementation plan to the repository knowledge map.
4. Run `pnpm docs:check`; expect `Documentation check passed.`

### Task 2: Add repository-owned Greptile policy

**Files:**

- Create: `.greptile/config.json`
- Create: `.greptile/files.json`
- Create: `.greptile/rules.md`
- Modify: `CONTRIBUTING.md`
- Modify: `.github/pull_request_template.md`

**Steps:**

1. Configure status checks, updates, `main`, all authors, and the 100-file
   fail-closed limit.
2. Point Greptile to the narrow system-of-record context.
3. Add rules for story scope, tests, secrets, personal accounts, truthful
   actions, reliability, and voice teardown.
4. Document the required check and actionable-comment workflow for
   contributors.
5. Validate both JSON files with `node -e` parsing and run
   `pnpm format:check`.

### Task 3: Publish and prove the review integration

**Files:**

- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/plans/2026-07-26-greptile-merge-gate.md`

**Steps:**

1. Run `pnpm verify`; expect exit code 0.
2. Inspect the complete diff and untracked files for secrets.
3. Commit and push `andrew/greptile-merge-gate`.
4. Open a ready-for-review pull request against `main`.
5. Set the Greptile confidence threshold to `4/5`.
6. Wait for the initial Greptile review and record its exact check context.
7. Add dated evidence to `docs/QUALITY_SCORE.md`, commit, and push.
8. Confirm the new commit triggers a fresh Greptile review and reaches at least
   `4/5`.

### Task 4: Enforce and verify the GitHub ruleset

**Files:**

- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/PLANS.md`
- Modify: `docs/plans/2026-07-26-greptile-merge-gate.md`

**Steps:**

1. Create an active default-branch ruleset with no bypass actors.
2. Require a pull request, resolved conversations, strict `verify`, and the
   observed Greptile check.
3. Block deletion and non-fast-forward updates to `main`.
4. Read the ruleset back through GitHub and confirm every intended rule.
5. Confirm the open pull request reports the required checks and merge gate.
6. Record final live evidence, move the plan to Completed, and rerun
   `pnpm verify`.
7. Commit and push the final evidence update.

## Deviations and constraints

- The required Fable/high planning call was attempted read-only with a `$2`
  budget and returned no advice because it exceeded that budget. Andrew
  explicitly approved Codex planning plus real-pull-request verification as the
  fallback.
- Configuration and documentation do not receive artificial unit tests, per
  `docs/TESTING.md`; their proof is parsing, documentation validation, the full
  local gate, and live provider behavior.

## Evidence

### Initial pull-request review

- PR [#2](https://github.com/andrewsiah/openfriend/pull/2) opened ready for
  review at commit `696c11e`.
- `verify` passed from GitHub Actions App ID `15368`.
- `Greptile Review` started automatically, returned `4/5`, and passed from
  Greptile App ID `867647`.
- Greptile's only concern was the short staging interval when
  `CONTRIBUTING.md` described enforcement before the external ruleset existed.

### Active enforcement

- Repository ruleset
  [19789735](https://github.com/andrewsiah/openfriend/rules/19789735) is active
  for the default branch with an empty bypass list.
- Effective rules require a pull request, resolved conversations, current
  `verify`, and current `Greptile Review` checks.
- Required check contexts are pinned to their observed GitHub Apps and use the
  strict latest-`main` policy.
- Branch deletion and non-fast-forward updates are blocked.
- The ruleset was read back through both the ruleset endpoint and the effective
  branch-rules endpoint.

### Pending final proof

This evidence update is the deliberate follow-up commit. Completion requires it
to trigger a fresh Greptile review automatically and for both required checks
to pass on the new head.
