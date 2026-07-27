# Dependabot review loop design

## Accepted story

> As Andrew and a future contributor, I can merge a dependency update only
> after the update passes repository verification, dependency review, and the
> same current Greptile review required of every other pull request.

## Acceptance criteria

- Dependabot-authored pull requests targeting `main` receive the exact required
  `Greptile Review` check from the Greptile GitHub App;
- the existing `verify`, `Dependency Review`, and Greptile ruleset requirements
  remain unchanged and have no bypass;
- no workflow is allowed to imitate, replace, or manufacture a Greptile result;
- known-incompatible TypeScript and ESLint major pull requests are closed with
  current compatibility evidence rather than hidden by a Dependabot ignore
  rule that could also suppress security updates;
- the existing Dependabot pull requests are retriggered or triaged from current
  checks, not merged from stale evidence; and
- live provider evidence is recorded before completion is claimed.

## Evidence-led design

The repository-local Greptile configuration already has no excluded authors,
but the Andrewsiah organization dashboard had an explicit
`dependabot[bot]` author exclusion. Pull requests from humans received Greptile
checks while four Dependabot pull requests did not. A human
`@greptileai` mention on a passing Dependabot pull request did not create a
check while the exclusion remained active.

The narrow fix is to remove only `dependabot[bot]` from the organization-level
author exclusion and explicitly set the repository `includeAuthors` policy to
`["*"]`. The wildcard removes ambiguity between an omitted/default include list
and an intentional all-author policy. The `renovate[bot]` dashboard exclusion
remains because Renovate is not part of this repository's dependency workflow.
GitHub branch protection remains the enforcement layer, and Greptile remains
the sole producer of its required check.

The npm Dependabot entry intentionally has no semver-major ignore for
`typescript` or `eslint`. GitHub documents that Dependabot ignore rules can
affect both version and security update pull requests, so suppressing those
majors could hide a future security fix available only in a new major. A
repository test protects that visibility. The current incompatible major pull
requests are closed with their failing verification evidence and can be
reconsidered when the ecosystem support arrives.

## Alternatives rejected

- A `pull_request_target` workflow that posts `@greptileai` adds write authority
  but cannot repair an author-filter decision. Live manual triggers remained a
  no-op on the previously filtered pull request after its head was recreated.
- A workflow that manufactures a successful `Greptile Review` result would
  defeat the required App identity and create false assurance.
- Removing Greptile from branch protection for dependency updates would create
  a weaker merge path and GitHub required checks cannot be scoped safely by
  pull-request author.
- Ignoring the TypeScript and ESLint majors in `dependabot.yml` was prototyped
  and rejected after review because the same ignore policy can suppress
  security-update pull requests.
- Ignoring every major dependency update would additionally hide useful
  migrations that have not been shown to be incompatible.

## External-state boundary

Only Andrew's personal `andrewsiah/openfriend` GitHub repository and Andrewsiah
Greptile organization are in scope. Provider changes contain no repository
contents or secrets. Existing unrelated worktrees and product pull requests
remain untouched.
