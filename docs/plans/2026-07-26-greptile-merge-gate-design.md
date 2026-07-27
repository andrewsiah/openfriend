# Greptile merge gate design

## Accepted story

> As Andrew and a future contributor, I can only merge a pull request after
> OpenFriend's complete latest diff has passed local CI and a current Greptile
> review, so that automated review is a dependable merge gate rather than an
> optional comment.

## Acceptance criteria

- every pull request targeting `main` receives a Greptile status check;
- a new commit makes the prior review stale and triggers a new review;
- the Greptile check passes only at confidence `4/5` or higher;
- GitHub requires a pull request, `verify`, Greptile, and resolved review
  conversations before merging to `main`;
- direct pushes, force pushes, and deletion of `main` are blocked without an
  administrator bypass;
- repository-owned review rules supply OpenFriend's user stories, architecture,
  testing, security, and reliability guidance;
- a real pull request proves the initial review, update review, and protected
  merge state before completion is claimed.

## Design

Greptile's repository-local `.greptile/` directory is the durable policy layer.
It reviews pull requests to `main`, re-runs on every update, emits a status
check, includes every author, and supplies narrowly selected context files plus
OpenFriend-specific review rules. Drafts remain excluded until they are marked
ready to avoid spending review credits on work that cannot merge. Pull requests
over 100 changed files fail closed because the required check remains absent;
they must be split or explicitly reviewed with `@greptileai`.

The Greptile organization setting supplies the `4/5` passing threshold. GitHub
supplies enforcement through an active repository ruleset for the default
branch. The ruleset requires a pull request, current `verify` and Greptile
checks, and resolved review conversations. It also prevents deletion and
non-fast-forward updates. No bypass actor is configured, including the
repository administrator.

Enforcement is activated only after a configuration pull request produces a
real Greptile check. This avoids guessing the check context and accidentally
locking `main`. A follow-up evidence commit must cause a second Greptile review;
only then is the observed check context added to the ruleset. Greptile remains
advisory evidence rather than ground truth: Andrew or Codex evaluates every
finding, fixes actionable issues, and documents justified false positives.

## Alternatives rejected

- A completion-only threshold of `0/5` proves that Greptile ran but permits
  merges it considers unsafe.
- Advisory comments without a required check do not prevent accidental merges.
- Auto-approval was not enabled because a passing automated check is sufficient
  for a solo repository and approval would add no independent reviewer.

## External-state boundary

Only Andrew's personal `andrewsiah/openfriend` GitHub repository and Andrewsiah
Greptile organization are in scope. No provider secret is stored in the
repository. The GitHub ruleset is created through the authenticated personal
account only after the real check identity is observed.
