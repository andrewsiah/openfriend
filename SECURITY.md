# Security policy

OpenFriend is pre-release. Only the latest `main` branch is supported during
early development; older commits, branches, preview deployments, and forks do
not receive security fixes from this project.

## Report a vulnerability privately

Use GitHub's
[private vulnerability reporting form](https://github.com/andrewsiah/openfriend/security/advisories/new).
Do not open a public issue, discussion, pull request, or review comment for a
suspected vulnerability. If the report concerns an exposed credential, do not
paste it into the report; identify the credential by purpose and revoke or
rotate it first.

Include:

- the affected commit, route, component, or dependency;
- the expected and observed behavior and potential impact;
- minimal reproduction steps using synthetic data;
- any known preconditions or suggested mitigation.

Do not include real personal conversations, tokens, private account data, or
unrelated provider output. The maintainer will acknowledge and investigate a
report as soon as practical, keep discussion private while a fix is developed,
and coordinate disclosure when it is safe to do so. This volunteer project
cannot promise a specific response or remediation deadline.

## Scope

Useful reports demonstrate an impact on OpenFriend code or configuration. A
vulnerable dependency without a reachable OpenFriend impact, social
engineering, denial-of-service traffic, and tests against infrastructure you
do not own are out of scope. Please avoid accessing, changing, or retaining
another person's data.

For the product security and privacy model, see
[docs/SECURITY.md](docs/SECURITY.md).
