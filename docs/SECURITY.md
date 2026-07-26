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

## Threats to address by phase

Phase 0 protects repository and account boundaries. Phase 1 adds ephemeral
Realtime-session protection and browser permission handling. Phase 2 adds
short-lived Watch authentication, device loss behavior, and transport review.
Memory and connectors require their own threat model before implementation.

Public vulnerability reporting lives in [../SECURITY.md](../SECURITY.md).
