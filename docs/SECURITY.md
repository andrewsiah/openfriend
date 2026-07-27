# Security and privacy

OpenFriend handles intimate conversation and potentially consequential life
actions. Privacy and control are part of the product contract.

## Data principles

- Collect only data needed by an accepted user story.
- Give durable records an explicit owner.
- Preserve provenance for transcripts, journals, memories, proposals, and
  actions.
- Let the user inspect, correct, reject, export, and delete personal data.
- Treat inferred memories as candidates until accepted.
- Separate conversational personalization from permission to act.
- Make retention behavior explicit before storing live transcripts.

## Credentials

- Provider credentials remain server-side.
- Never place secrets in Git, prompts, screenshots, shell history, logs,
  browser bundles, or durable Watch storage.
- The independent Watch receives short-lived, scoped service credentials.
- Rotate any credential shared in chat before using it.
- Commit `.env.example` names and comments only.
- Use Stripe Projects or provider secret stores for credential synchronization.

## Action safety

Voice may propose actions. Consequential writes require a clear review and
approval path unless a narrowly scoped standing permission has been designed
and accepted later.

The interface must identify:

- what will change;
- which external system will change;
- the relevant account;
- when approval expires;
- whether execution is proposed, in progress, confirmed, failed, cancelled, or
  uncertain.

## Account isolation

OpenFriend is a personal project. Never create or link resources in Ready Homes
or another company organization. Verify owner and environment before any
provider mutation. Development is the default; production access, paid plans,
and spend changes require explicit human intent.

## Repository supply-chain controls

Repository configuration schedules weekly grouped pnpm and GitHub Actions
updates, with a cooldown for routine releases. Pull requests that change the
dependency graph run a read-only dependency review and fail when they introduce
a known vulnerability of moderate or greater severity. The repository changed
its package-manager declaration from pnpm 11 to pnpm 10.34.5 because pnpm 10 was
within GitHub Dependabot's documented support range when verified on
2026-07-26; the same exact version is used locally and in CI. Workflow actions
are pinned to the verified commits behind their documented release tags.

Provider-side controls are separate from repository configuration. On
2026-07-26, `gh api` verification through the GitHub REST API confirmed that the
personal `andrewsiah/openfriend` repository's vulnerability-alerts endpoint
returned HTTP 204, Dependabot security updates were enabled, and private
vulnerability reporting was enabled.

CodeQL default setup is configured. Validation run
[`30238344037`](https://github.com/andrewsiah/openfriend/actions/runs/30238344037)
completed successfully: Actions, JavaScript/TypeScript, and Swift analyses all
reported success, while Adjust Configuration was skipped.

Dependency Review first passed on
[PR #4](https://github.com/andrewsiah/openfriend/pull/4) at commit `80aab33`.
GitHub identified the exact `Dependency Review` context as GitHub Actions App ID
`15368`. Active ruleset `19789735` now requires that context alongside `verify`
and `Greptile Review`, without a bypass actor and with strict latest-`main`
checks and resolved review conversations.

On 2026-07-27, the first public-harness push exposed six advisories inherited
from `main`. Explicit transitive floors move Hono's Node adapter, PostCSS, and
Sharp to patched releases. The frozen install, full local gate, deterministic
browser stories, production build, and a native Sharp transform pass with those
versions.

The final high-severity `brace-expansion` advisory was isolated to the
development-only ESLint chain. `minimatch` 3 requires the legacy callable
CommonJS export, while patched `brace-expansion` 5 provides a named `expand`
export. OpenFriend now overrides only that vulnerable transitive copy to 5.0.8
and carries a three-line compatibility adapter for `minimatch` 3. The adapter
accepts either export shape without changing matching behavior. Frozen install,
ESLint, the full repository gate, deterministic browser stories, and
`pnpm audit --audit-level high` pass; the audit reports no known
vulnerabilities. Remove the checked-in patch and override together when the
upstream ESLint chain adopts a compatible `minimatch`.

## Realtime client-secret boundary

The Phase 1 client-secret route intentionally has no application authentication
yet. It may run locally or on a preview protected by the hosting provider, but
must not be exposed on an unprotected public deployment. Before public access,
add application authentication and request rate limiting to the route.

The route may return only the short-lived Realtime client secret, its expiry,
and the selected model. It must never return or log the server API key or an
upstream error body.

## Phase 2 Watch authentication boundary

The planned Watch route is separate from the unauthenticated Phase 1 browser
route. It verifies a nonce-bound Sign in with Apple identity token, expected
issuer, audience, expiry, and a single allowed subject before minting a
server-selected Economy Realtime client secret.

The Watch holds the identity token and Realtime secret in memory only for the
active session. The gateway stores no Watch session, email, name, audio, or
transcript. The allowed Apple subject and safety-identifier key belong only in
an approved personal secret store. Responses remain no-store and sanitized.

Keep hosting protection enabled until the authenticated route and rate limit
are verified in the personal provider account. App Attest, refresh tokens,
multi-user identity, and durable auth state are deferred. Locking or removing
the physical Watch must stop capture and leave no durable bearer credential.
The complete boundary and threat gates are in the
[Phase 2 design](plans/2026-07-27-phase-2-watch-conversation-design.md).

## Threats to address by phase

Phase 0 protects repository and account boundaries. Phase 1 adds ephemeral
Realtime-session protection and browser permission handling. Phase 2 adds
short-lived Watch authentication, device loss behavior, and transport review.
Memory and connectors require their own threat model before implementation.

Public vulnerability reporting lives in [../SECURITY.md](../SECURITY.md).
