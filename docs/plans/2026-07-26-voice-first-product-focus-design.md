# Voice-First Product Focus Design

**Date:** 2026-07-26  
**Status:** Accepted product direction  
**Audience:** Contributors and coding agents

## Decision

OpenFriend is the relationship layer for personal AI: one canonical Friend that
Andrew can speak with through a responsive web app on phone and desktop
browsers, and later through an independent Apple Watch app. The Friend maintains
an owned identity and permissioned continuity over time. When deeper work is
needed, it delegates a bounded task to an external agent Andrew already trusts
and truthfully reports the result.

The product is voice-first, not voice-only and not Watch-only. Responsive web is
the primary early surface because it is broadly available, supports both phone
and desktop use, and provides visual controls for memory, review, privacy, and
diagnostics. The Watch is a compelling field test of whether the same
relationship remains useful when Andrew leaves his phone behind.

OpenFriend initially has one canonical Friend. Optional specialist friends come
only after identity and continuity work reliably. Friend sharing and a social
network are later possibilities, not prerequisites for the one-to-one
experience.

## Approaches considered

### Build a complete assistant and execution platform

OpenFriend could own voice, memory, models, agent loops, sandboxes, connectors,
and execution. This offers end-to-end control but duplicates fast-moving agent
platforms, expands the security boundary, and diverts work from interaction
quality. This approach is rejected.

### Build a pure companion with no execution

OpenFriend could focus only on conversation, persona, and memory. This is the
smallest relational product, but it makes the Friend less useful and ignores the
strong leverage available from agents Andrew already uses. This remains a valid
degraded mode, not the complete direction.

### Build the relationship layer with replaceable operators

This is the accepted approach. OpenFriend owns voice interaction, Friend
identity, relationship memory, context boundaries, delegation, approvals, and
truthful reporting. Live-model providers and external agents remain replaceable.
The first operator integration is deliberately singular and bounded; no generic
agent framework or connector marketplace is built in advance.

## Product boundary

OpenFriend owns:

- one canonical Friend and its recognizable conversational identity;
- full-duplex interaction behavior across responsive web and Watch;
- user-owned relationship memory, provenance, correction, and forgetting;
- the decision to answer, remember, ask, or delegate;
- least-disclosure task packaging for an external operator;
- durable task status, approval, uncertainty, and confirmed-result reporting;
- later memory boundaries for specialist and shared-room conversations.

OpenFriend borrows:

- live speech models and their transport SDKs;
- frontier reasoning models;
- execution runtimes, sandboxes, tools, and connector ecosystems;
- supported agent interfaces from Codex, Claude Code, Hermes, or later
  compatible protocols;
- managed database, authentication, hosting, and secret storage.

GPT-Live adoption is a provider upgrade, not a product phase. Calendar, email,
messaging, coding, travel, and similar connectors normally belong to the chosen
operator. OpenFriend builds a native connector only when an accepted interaction
story cannot be served safely through delegation.

## Surfaces and interaction flow

The responsive web app is both the first usable product and the interaction
laboratory. Phone and desktop layouts expose the same Friend and conversation
state. Voice is the fastest path, while touch, keyboard, transcript, memory
review, and approval controls keep the experience accessible and trustworthy.
A native iPhone app is not required to prove this loop.

The independent Watch app later connects to the same Friend identity and memory.
It proves a distinctive field scenario: Andrew leaves the phone behind, walks
outside, starts a conversation over Wi-Fi or cellular, and understands exactly
what the Friend heard during network or audio disruption. Simulator success is
not Watch acceptance; supported runtime, wrist-down, audio-route, and
connectivity behavior require physical-device evidence.

During normal conversation, the live model handles timing, speech, listening,
interruptions, and short responses. The durable Friend selects bounded memories
for continuity. When work requires deeper reasoning or action, the Friend sends
a structured task and the minimum approved context through the delegation
gateway. The live conversation stays responsive. The external operator returns
status, proposals, approval requests, and confirmed results without becoming
the Friend's identity.

## Memory and multiple friends

Long-term memory is a relationship feature and a trust boundary. Raw transcripts
do not automatically become accepted memory. Early memory begins with explicit
requests such as “remember this,” records provenance and ownership, and supports
inspection, correction, and deletion. The Friend distinguishes remembered facts
from inference and repairs mistaken recall plainly.

The canonical Friend has stable identity across sessions, browser layouts, live
profiles, and later Watch conversations. Switching from an economy model to a
quality model must not silently create a different character. Likewise,
operator output does not enter relationship memory without passing the memory
policy.

Specialist friends are later, optional identities for a different perspective
or role. “Founder friend” or “reflection friend” may be useful product language;
“therapist” is avoided unless OpenFriend deliberately enters the corresponding
clinical and safety domain. Specialist memory is separate by default. Future
multi-friend conversations distinguish private friend memory, user-shared
memory, and room-specific encounter memory.

A shareable friend artifact contains only an inspectable public blueprint:
identity, behavior, public knowledge, and permitted capabilities. It excludes
private conversations, memories, credentials, and operator connections. An
import creates a new owned relationship rather than impersonating the original.

## Errors, safety, and degraded states

Interaction failures are part of the relationship experience. The Friend must
say when microphone access is denied, audio is disconnected, a turn may not have
been received, memory is uncertain, the operator is offline, approval is
required, or an action result cannot be confirmed. It does not smooth those
states into fictional continuity.

Voice sessions require deterministic teardown because abandoned microphone,
WebRTC, WebSocket, or provider sessions can leak data or continue incurring
cost. Delegation uses least disclosure and sends no wholesale memory archive.
Consequential actions remain proposed until the exact action is approved, and
remain uncertain until their source confirms the outcome.

OpenFriend aims for warmth and human-quality interaction without claiming to be
human, imitating a real person, encouraging exclusive attachment, or optimizing
emotional dependency. The canonical Friend should be capable of disagreement,
uncertainty, and encouraging appropriate human connection. Specialist friends
must not imply professional qualifications they do not have.

## Story and testing strategy

[USER_STORIES.md](../USER_STORIES.md) is the stable behavioral registry. Story
IDs such as `OF-101` appear in implementation plans, focused tests, conversation
evaluations, commits, and verification evidence. Stories remain Candidate until
Andrew accepts one for implementation. Accepting a phase direction does not
authorize every story within it.

The sequence is:

1. interaction quality on responsive phone and desktop web;
2. the canonical Friend and thin permissioned memory on web;
3. the same Friend in a phone-free physical-Watch field test;
4. one bring-your-own-operator integration;
5. optional specialist friends with explicit memory boundaries;
6. safe blueprint sharing and network concepts only after sustained one-to-one
   value.

Deterministic behavior uses red-green-refactor tests. Conversation quality uses
repeatable scenarios scored for latency, turn-taking, interruption recovery,
patience, warmth, continuity, honest repair, and resistance to accidental
disclosure or emotional overreliance. Responsive browser evidence includes
phone and desktop viewports, touch and keyboard fallbacks, denied permissions,
failure states, and mandatory voice teardown. Watch claims require real hardware.

## Scope cuts

The following are explicitly outside the initial implementation:

- a generic agent runtime, sandbox, or plugin ecosystem;
- support for every agent, live provider, or connector;
- a native iPhone or Mac app before responsive web proves insufficient;
- automatic extraction of every conversation into durable memory;
- multiple equal-status friends before the canonical Friend works;
- a public friend feed, autonomous friend society, or engagement-driven social
  network;
- hidden recording, ambient surveillance, or unapproved consequential action;
- clinical therapist claims or voice impersonation.

Each later capability must be earned by an accepted user story and observable
evidence from the core relationship.

## Research evidence

- [Introducing GPT-Live](https://openai.com/index/introducing-gpt-live/) validates
  continuous interaction separated from deeper delegated work; API availability
  remains a replaceable-provider concern.
- [OpenAI Voice Agents](https://openai.github.io/openai-agents-js/guides/voice-agents/)
  supports the initial responsive-web experiment and delegation through tools.
- [Creating independent watchOS apps](https://developer.apple.com/documentation/watchos-apps/creating-independent-watchos-apps/)
  and [TN3135](https://developer.apple.com/documentation/technotes/tn3135-low-level-networking-on-watchos)
  support the independent-Watch direction while requiring narrow networking and
  physical-device validation.
- [A2A](https://a2a-protocol.org/latest/specification/) demonstrates a maturing
  agent-to-agent contract, but OpenFriend does not implement a universal
  protocol before its first operator story requires one.
- [Kindroid group chats](https://kindroid.ai/docs/article/groupchats/) show that
  multiple personas and shared conversations already exist; OpenFriend's initial
  wedge remains interaction continuity and user-owned execution.
- [PERMA](https://arxiv.org/abs/2603.23231) reports continuing difficulty with
  persona coherence across time and domains, supporting investment in
  relationship memory rather than generic retrieval alone.
- [Affective use research](https://openai.com/index/affective-use-study/) supports
  explicit healthy-use and emotional-reliance evaluation.

## Review constraint

A bounded Fable/high product review was attempted on 2026-07-26 in read-only
plan mode. The tool reported that its Fable 5 usage limit had been reached, so
this document used the disclosed Codex-only fallback. A later Fable review may
challenge this direction, but is not evidence that the current design has been
implemented or verified.
