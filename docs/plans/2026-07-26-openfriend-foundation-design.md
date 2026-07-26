# OpenFriend Foundation Design

**Status:** Accepted

**Date:** 2026-07-26

**Audience:** Contributors and coding agents

## Summary

OpenFriend is a personal-first, open-source life assistant inspired by the ease,
continuity, and conversational presence of Samantha in *Her*. It is not a voice
command interface with a friendly prompt. Its primary product is a rich,
continuous relationship conducted through full-duplex voice, backed by an
operator that can remember, reason, prepare work, and act with permission.

The Apple Watch is the priority surface because OpenFriend should remain useful
when the user leaves their phone behind. The web application is developed first
because it is the fastest environment for testing voice behavior and serves as
the visual dashboard for information that is inefficient or unsafe to review by
voice alone.

The first user is Andrew. The architecture keeps data ownership explicit so the
project can later support self-hosting and multiple users without making those
requirements part of the first milestone.

OpenFriend is distributed under the MIT License.

## Product principles

### Conversation is the interface

OpenFriend should feel like an intelligent companion that can act, not a
microphone attached to an intent parser. It must support natural timing,
interruptions, pauses, active listening, warmth, initiative, and continuity.
Conversation quality is a product outcome and receives its own evaluations.

GPT-Live is the north star because its full-duplex architecture continuously
decides whether to listen, speak, pause, interrupt, or use a tool. It also
decouples live interaction from deeper work so the conversation can continue
while a frontier model or agent works in the background.

As of 2026-07-26, GPT-Live is available in ChatGPT but not yet in the API.
OpenFriend will prototype with the current Realtime API behind a replaceable
live-conversation boundary and adopt GPT-Live when API access becomes available.

References:

- [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/)
- [OpenAI Voice Agents SDK](https://openai.github.io/openai-agents-js/guides/voice-agents/)

### Voice proposes; visual interfaces confirm

Voice is efficient for conversation, capture, and short answers. It is less
efficient for reviewing several tasks, comparing schedules, editing structured
data, or approving consequential actions.

The core interaction loop is:

1. The user speaks naturally.
2. OpenFriend interprets the conversation and updates its understanding.
3. It answers immediately when voice is sufficient.
4. It creates structured drafts when visual review is better.
5. It presents those drafts in a focused web review experience.
6. The user approves, edits, or rejects them.
7. OpenFriend executes approved actions and reports the confirmed outcome.

OpenFriend never claims an action succeeded before the underlying system
confirms it.

### Distribution and human-computer interaction are the innovation

OpenFriend should not invent model infrastructure, databases, deployment
systems, authentication, or generic agent loops when mature supported projects
already exist. The project differentiates through the end-to-end experience:
continuous voice on the Watch, thoughtful transitions to visual review,
personal continuity, and trustworthy action.

Prefer widely adopted libraries, official SDKs, and managed services. Introduce
custom infrastructure only when a measured product requirement cannot be met by
an existing option.

## Initial scope

The first life-admin scope includes:

- Continuous voice conversation.
- Persistent conversational identity and memory.
- Journaling.
- OpenFriend-native tasks.
- A visual action inbox with explicit confirmation.
- Google Calendar after the Watch experience is validated.

Connectors such as email, messaging, travel, and broad calendar support are not
initial priorities.

## Product surfaces

### Web

The web application is both the development laboratory and the visual command
center. It contains:

- Live voice sessions.
- Model and voice-profile selection.
- Conversation history.
- Tasks and journal entries.
- Long-term memories and their provenance.
- Pending actions and confirmations.
- Calendar views and proposed changes.
- Integration and privacy settings.
- Session diagnostics, latency, and cost information for development.

### Apple Watch

The Watch application is an independent SwiftUI application. It must remain
useful without a paired iPhone and connect to the OpenFriend service over Wi-Fi
or the Watch's cellular connection.

The first Watch vertical slice includes:

- Sign-in and short-lived service credentials.
- Starting and ending a live conversation.
- Capturing and streaming audio.
- Playing live responses.
- Clear connection, reconnection, and delegated-task status.
- Short glanceable results.
- A handoff to the web dashboard for detailed review.

The paired iPhone may provide opportunistic convenience later, but it must not
be the Watch application's primary source of data or connectivity.

References:

- [Creating independent watchOS apps](https://developer.apple.com/documentation/watchos-apps/creating-independent-watchos-apps/)
- [Low-level networking on watchOS](https://developer.apple.com/documentation/technotes/tn3135-low-level-networking-on-watchos)

### Later surfaces

An iPhone companion and Mac application may follow after the Watch and web loop
proves valuable. They are not required for the first accepted user stories.

## Technical architecture

OpenFriend uses a TypeScript monorepo for the web application, server runtime,
shared contracts, and provider adapters. The Watch application is native Swift
and consumes the same versioned service contracts.

The initial stack is:

- Next.js and TypeScript for the web application and server endpoints.
- OpenAI Agents SDK for the Realtime voice prototype.
- WebRTC for browser audio.
- A watchOS-compatible streaming transport for the native Watch client.
- Supabase Postgres and Auth for durable application data.
- Vercel for web deployment.
- Stripe Projects for provisioning, credential synchronization, and environment
  management.
- SwiftUI for the independent Watch application.

The runtime is split into two explicit responsibilities:

### Live companion

The live companion owns the continuous conversation: audio transport, timing,
interruptions, speaking, listening, short responses, and deciding when to use a
tool. It must remain responsive while delegated work continues elsewhere.

The first implementation uses the OpenAI Realtime API. Its public contract is
provider-neutral enough to accept GPT-Live variants and other live-voice
providers later, but no provider abstraction should exceed the needs of the
first two working profiles.

### Background operator

The background operator owns deeper reasoning, persistent tasks, integrations,
and action execution. It receives structured delegated work, emits durable
status updates, and returns results to the live companion or visual dashboard.

The operator interface must permit a later Pi-backed implementation. Pi is a
promising option because its SDK supplies model/provider routing, sessions,
streaming, tools, compaction, and several subscription or API-key
authentication paths. It will be evaluated through a bounded spike rather than
adopted speculatively.

References:

- [OpenAI Realtime delegation](https://openai.github.io/openai-agents-js/guides/voice-agents/build/)
- [Pi SDK](https://pi.dev/docs/latest/sdk)
- [Pi providers](https://pi.dev/docs/latest/providers)
- [OpenClaw agent runtime architecture](https://docs.openclaw.ai/agent-runtime-architecture)

## Live model profiles

Model selection is configuration, not branching application code. A
`LiveModelProfile` registry records:

- Stable profile identifier.
- Provider.
- Provider model identifier.
- Display name and description.
- Relative cost and quality tier.
- Capabilities such as audio, tool use, interruption handling, and full duplex.
- Availability and experimental status.

The initial profiles are:

| Profile | Model | Purpose |
| --- | --- | --- |
| Economy | `gpt-realtime-2.1-mini` | Default development and routine use |
| Quality | `gpt-realtime-2.1` | Conversation-quality comparison |

The older `gpt-realtime-mini` model is deprecated and must not be used for new
work.

The user selects a default profile in Settings and may override it before
starting a session. Switching profiles starts a new live session. The
conversational model and background operator model are separate choices, so an
economy voice session can still delegate hard work to a stronger model.

GPT-Live mini and full profiles will be added when their API model identifiers
and contracts are publicly available. Other live-voice providers may later
register profiles through the same interface. The UI must disclose missing
capabilities instead of treating all voice providers as equivalent.

References:

- [OpenAI model catalog](https://developers.openai.com/api/docs/models)
- [GPT-Realtime-2.1 mini](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)

## Data and action model

User ownership is explicit on durable records even while the product supports
one user. The initial domain includes:

- User profile and preferences.
- Conversation and session metadata.
- Transcript items and provenance.
- Journal entries.
- Memory candidates, accepted memories, and source references.
- Tasks.
- Delegated jobs.
- Proposed actions.
- Approval decisions.
- Execution attempts and audit records.
- Model profiles and session evaluation metrics.

Consequential actions follow a durable state machine:

`proposed -> awaiting_approval -> executing -> completed | failed | cancelled`

Retries must not create duplicate external actions. When the result of a write
is uncertain, OpenFriend stops and asks for review rather than retrying blindly.

## Infrastructure and secrets

Stripe Projects is the default provisioning path. Manual provider setup is a
documented fallback, not the normal workflow.

The repository records service topology and environment-variable names but
never credential values. Development is the default provisioning environment.
Production creation, access, paid upgrades, and spend changes require explicit
human intent.

The initial infrastructure is deliberately small:

- Vercel.
- Supabase.
- OpenAI credentials when required by the API.

Observability, queues, analytics, and other services are added only when an
accepted user story needs them.

Account-owner interactions such as browser sign-in, two-factor authentication,
payment approval, Apple Developer agreements, and device trust cannot always be
automated. These should be batched and documented rather than requested
piecemeal.

Reference:

- [Stripe Projects](https://projects.dev/)

## Delivery phases

### Phase 0: Foundation

Create the public repository, agent-first documentation system, monorepo, CI,
deployable web shell, shared contracts, Stripe Projects state, and evaluation
criteria. Avoid speculative product machinery.

### Phase 1: Web Voice Lab

Deploy the smallest useful Realtime conversation on the web. Include:

- Economy and quality model profiles.
- Microphone and session controls.
- Live connection state.
- Interruption handling.
- Transcript and session diagnostics.
- Latency and cost comparison.

The acceptance criterion is a repeatably fluid conversation, not a feature-rich
dashboard.

### Phase 2: Watch Field Test

Build the independent Watch vertical slice immediately after the browser voice
loop works. Test on a physical Watch:

- With the iPhone nearby.
- With the iPhone disconnected.
- Over Wi-Fi.
- Over Watch cellular.
- While walking outdoors with background noise.
- Across brief connectivity loss and reconnection.

The defining acceptance test is that Andrew can leave the phone behind, walk
outside, and hold a useful continuous conversation with OpenFriend from the
Watch.

### Phase 3: The Friend

Add shared identity, conversational style, continuity across sessions,
journaling, and explicit long-term memory across Watch and web.

### Phase 4: The Operator

Add background delegation, OpenFriend-native tasks, visual review,
confirmations, execution, and audit history.

### Phase 5: Connectors

Add Google Calendar, briefings, task extraction, and calendar proposals.
Additional connectors remain user-story driven.

### Phase 6: GPT-Live and extensibility

Adopt GPT-Live when the API ships, add additional live-voice profiles, evaluate
Pi-backed operator profiles, and document self-hosting and contributor
extension points.

## Engineering method

All product work is user-story driven, test-driven, and constrained by YAGNI.

### User stories

Every feature begins with a concrete user story and acceptance criteria. Prefer
vertical stories that exercise a real surface over horizontal infrastructure
projects.

Example:

> As Andrew leaving home without his phone, I can start a conversation from my
> Watch over cellular and hear OpenFriend respond, so that the assistant remains
> available while I am out.

Plans and pull requests must state the story they advance and the observable
evidence that proves it works.

### Test-driven development

For production behavior, use red-green-refactor:

1. Write one focused test describing the next behavior.
2. Run it and verify that it fails for the expected reason.
3. Write the smallest implementation that makes it pass.
4. Run the focused test and the relevant suite.
5. Refactor only while the suite remains green.

Production code written before its test must be removed and implemented again
from the failing test. Exceptions for disposable spikes, generated code, or
configuration require explicit human agreement.

### YAGNI

Do not build capabilities for hypothetical users, providers, platforms, or
scale. Introduce only the smallest interface required by the current accepted
story. A future extension point is justified only when it keeps today's code
simpler or supports a scheduled near-term phase.

## Reliability and privacy

- Never report an action as complete before receiving confirmation.
- Give every delegated job and external write a stable identifier.
- Use bounded retries, timeouts, cancellation, and durable status.
- Keep provider credentials server-side.
- Give the Watch only short-lived credentials.
- Never place secrets in prompts, browser bundles, logs, Git, or durable Watch
  storage.
- Preserve enough session state to reconnect without duplicating work.
- Provide ownership, provenance, review, and deletion paths for memories,
  journals, and transcripts.
- Make degraded and offline states explicit.

## Evaluation strategy

Each phase has a checked-in acceptance test and a deployed checkpoint.
Evaluation includes:

- Unit tests for domain behavior and state transitions.
- Integration tests for Supabase, Realtime session creation, and delegation.
- Browser tests for voice controls, model selection, approvals, and recovery.
- Physical Watch tests across supported network routes.
- Conversation evaluations for naturalness, interruption timing, patience,
  warmth, recall, initiative, and recovery.
- Quality, latency, and cost comparisons between model profiles.
- Safety evaluations for emotional overreliance, accidental disclosure,
  hallucinated actions, and unauthorized execution.

A feature is complete when the intended user experience works repeatedly, not
merely when an API returns successfully.

## Repository knowledge system

Following OpenAI's harness-engineering guidance, the repository treats
versioned documentation as the system of record. `AGENTS.md` is a short map,
not an encyclopedia. Durable product, architecture, testing, security, and
execution-plan guidance lives under `docs/` and is progressively disclosed.

Complex work uses checked-in execution plans with progress and decision logs.
Active and completed plans remain discoverable. Documentation must evolve with
the code and should eventually receive mechanical link, structure, and
freshness checks.

Reference:

- [Harness engineering: leveraging Codex in an agent-first world](https://openai.com/index/harness-engineering/)
