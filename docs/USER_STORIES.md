# User stories

This file is the stable registry for OpenFriend product behavior. Plans, tests,
commits, and verification evidence should cite the relevant story ID.
Infrastructure belongs inside the smallest story that needs it.

Statuses mean:

- **Accepted** — implementation is authorized when an execution plan exists.
- **Candidate** — directionally useful, but must be promoted to Accepted before
  implementation.
- **Completed** — acceptance criteria have current evidence in the repository or
  [QUALITY_SCORE.md](QUALITY_SCORE.md).

Accepting one story does not accept its whole phase. New behavior should begin
with one focused failing test for one accepted criterion.

## Phase 0: Foundation

### OF-001 — Understand and run the foundation

**Status:** Completed

> As Andrew or a future contributor, I can open the public OpenFriend repository
> and deployed web shell, understand exactly what is being built, choose between
> the accepted economy and quality Realtime profiles, and run the documented
> quality gates, so that conversation experiments begin from a trustworthy
> shared foundation.

Acceptance:

- agent-first docs describe the voice-first Friend and replaceable operator;
- TDD, YAGNI, and user-story-driven development are enforceable guidance;
- the profile registry exposes Economy and Quality without deprecated models;
- the web shell truthfully states that voice is not connected;
- the independent Watch target builds and tests a truthful idle state without
  audio, networking, signing, or a live-Watch claim;
- local checks, personal infrastructure ownership, deployment, and public repo
  state are verified.

## Phase 1: Interaction Lab

The responsive web application is the primary early surface. It must be useful
in desktop and phone browsers; the product is voice-first, not Watch-only.

### OF-101 — Start a voice-first web conversation

**Status:** Candidate, next

> As Andrew using a supported desktop or phone browser, I can grant microphone
> access and start a live conversation with my Friend, so that speaking is the
> fastest way to use OpenFriend wherever I have the web app.

Acceptance:

- the same responsive web experience works at supported desktop and phone
  viewport sizes without requiring a native phone app;
- microphone permission is requested only after an explicit user action;
- ephemeral credentials are created server-side and no long-lived provider
  credential reaches the browser;
- the interface communicates connecting, live, reconnecting, ended, denied, and
  failed states;
- ending the conversation stops microphone tracks, audio playback, and the live
  provider session;
- keyboard and touch controls remain usable when voice is unavailable.

### OF-102 — Converse without turn-taking friction

**Status:** Candidate

> As Andrew speaking naturally, I can pause, correct myself, interrupt my Friend,
> and continue after brief overlap, so that the conversation feels attentive
> rather than like recording and submitting voice commands.

Acceptance:

- a short thinking pause does not consistently cause a premature response;
- Andrew can interrupt generated speech and the unheard remainder is not treated
  as delivered conversation history;
- self-correction and brief overlap do not create duplicate assistant replies;
- the Friend can remain silent when asked to listen;
- reconnection or audio failure is stated plainly and does not fabricate a heard
  or spoken turn;
- a scored conversation evaluation records turn-taking, interruption recovery,
  patience, warmth, and latency.

### OF-103 — Compare live conversation profiles

**Status:** Candidate

> As Andrew evaluating conversational feel, I can run otherwise equivalent
> sessions with available live profiles, so that I can compare naturalness,
> latency, reliability, and cost without coupling OpenFriend to one model.

Acceptance:

- profile selection happens before a session;
- switching ends the old session and creates a new one;
- an evaluation records profile, latency, qualitative scores, failures, and
  estimated cost;
- missing capabilities are disclosed instead of normalizing unlike providers;
- GPT-Live or another provider can replace a profile without becoming a product
  phase or changing the Friend's durable identity.

## Phase 2: The Canonical Friend

OpenFriend begins with one canonical Friend. Specialist friends are deliberately
later so identity and continuity can be proven before multiplying personas.

### OF-201 — Return to the same Friend

**Status:** Candidate

> As Andrew returning on a phone or desktop browser, I encounter the same
> recognizable Friend with continuity from our prior conversations, so that
> OpenFriend feels like an ongoing relationship rather than a new chatbot
> session.

Acceptance:

- the Friend has one stable identity across supported web layouts and sessions;
- conversational style remains recognizably consistent without repeating a
  character description;
- a new session receives only the bounded context needed for continuity;
- the Friend distinguishes remembered context from guesses and current
  conversation content;
- changing the live-model profile does not silently create a different Friend.

### OF-202 — Remember something with permission

**Status:** Candidate

> As Andrew sharing something that should matter later, I can tell my Friend to
> remember it and have it recalled appropriately in a future conversation, so
> that the relationship gains useful continuity over time.

Acceptance:

- an explicit request to remember creates a memory with owner, source,
  timestamp, and sensitivity metadata;
- the Friend confirms what it understood without claiming broader knowledge;
- a later session can recall the memory when relevant without dumping unrelated
  personal context;
- sensitive memory is not sent to a delegated operator unless the task requires
  it and Andrew permits that disclosure;
- raw transcripts are not automatically treated as accepted long-term memory.

### OF-203 — Inspect, correct, and forget memory

**Status:** Candidate

> As Andrew, I can see why my Friend remembers something, correct it, or delete
> it, so that personalization remains trustworthy and under my control.

Acceptance:

- the responsive web app shows the memory value and its provenance;
- Andrew can edit an inaccurate memory and the corrected value is used later;
- Andrew can delete a memory and it is excluded from future model context and
  retrieval;
- deletion, failure, and uncertain deletion states are distinguishable;
- the Friend repairs a mistaken recall without defensiveness or pretending it
  was correct.

## Phase 3: Watch Field Test

The Watch is the strongest phone-free demonstration of the same canonical
Friend, not a separate identity or the only primary product surface.

### OF-301 — Talk to the same Friend without the phone

**Status:** Candidate

> As Andrew leaving home without my phone, I can start a voice conversation from
> my Watch over Wi-Fi or cellular and reach the same Friend I use on the web, so
> that the relationship remains available while I am out.

Acceptance:

- independent Watch authentication uses a short-lived credential;
- live audio works on a physical Watch without the paired iPhone data path;
- the Watch reaches the same Friend identity and permissioned memories as the
  responsive web app;
- connection state and conversation ending are glanceable;
- supported wrist-down, Wi-Fi, cellular, background-noise, and audio-route
  behavior is verified on a physical Watch;
- unsupported watchOS runtime behavior is disclosed rather than hidden behind a
  simulator-only success.

### OF-302 — Recover a Watch conversation truthfully

**Status:** Candidate

> As Andrew moving through unreliable connectivity, I can understand whether my
> Watch conversation is live, reconnecting, or ended and resume without
> duplicate turns, so that I can trust what my Friend actually heard.

Acceptance:

- brief loss of connectivity produces an explicit reconnecting state;
- captured audio is not claimed as received until the service acknowledges it;
- reconnection avoids replaying an acknowledged user turn or assistant reply;
- an unrecoverable session ends cleanly and offers a new session;
- physical-device evidence covers Wi-Fi, cellular, and phone-disconnected
  conditions.

## Phase 4: Bring Your Own Operator

OpenFriend owns delegation and truthful reporting. The selected external agent
owns its runtime, sandbox, tools, and connectors.

### OF-401 — Delegate to my chosen agent

**Status:** Candidate

> As Andrew, I can connect one supported agent I already trust and ask my Friend
> to delegate deeper work to it, so that OpenFriend helps me without rebuilding
> Codex, Claude Code, Hermes, or another execution platform.

Acceptance:

- the first implementation supports one bounded operator adapter rather than a
  universal provider framework;
- OpenFriend sends a structured task with the least personal context needed;
- the Friend remains responsive while the operator works;
- queued, running, awaiting-approval, completed, failed, cancelled, uncertain,
  and operator-offline states are distinguishable;
- disconnecting an operator revokes future delegation without deleting
  unrelated Friend memories.

### OF-402 — Approve and verify consequential work

**Status:** Candidate

> As Andrew, I can review consequential work proposed by my chosen operator and
> hear that it completed only after the source system confirms it, so that my
> Friend is useful without overstating what happened.

Acceptance:

- consequential external writes wait for the required approval;
- approval is bound to the exact proposed action and expires when that proposal
  materially changes;
- completion includes confirmation from the operator or source system;
- uncertain outcomes stop for review instead of being retried blindly;
- the responsive web app provides detailed review when voice is insufficient.

## Phase 5: Specialist Friends

### OF-501 — Add one specialist friend

**Status:** Candidate

> As Andrew, I can add an optional specialist friend with a distinct role and
> personality while keeping my canonical Friend, so that I can seek a different
> perspective without fragmenting my primary relationship.

Acceptance:

- the canonical Friend remains the default entry point;
- the specialist's identity and purpose are clear before the conversation;
- specialist memories are separate by default;
- model or operator selection is configuration, not the specialist's identity;
- removing a specialist does not delete the canonical Friend's memories.

### OF-502 — Share context between friends deliberately

**Status:** Candidate

> As Andrew, I can choose what a specialist friend learns from my canonical
> Friend or a shared conversation, so that multiple friends can know one another
> without silently sharing everything about me.

Acceptance:

- private, friend-specific, user-shared, and room-specific memories have
  distinguishable scopes;
- no friend receives another friend's private memory by default;
- a shared encounter records which participants could access it;
- Andrew can inspect and revoke future use of shared context;
- revocation does not rewrite historical evidence of actions already taken.

## Phase 6: Sharing and friend network

### OF-601 — Share a friend blueprint without private history

**Status:** Candidate, intentionally late

> As a future OpenFriend user, I can share or import a friend's public blueprint
> without transferring its creator's private memories, so that useful
> personalities can travel safely between people.

Acceptance:

- the export distinguishes public identity, instructions, and capabilities from
  private memory and credentials;
- private conversations, memories, credentials, and operator connections are
  excluded by default;
- the importer can inspect the blueprint before creating a new friend;
- the imported friend starts as a new owned identity rather than impersonating
  the original relationship;
- discovery feeds and autonomous friend-to-friend activity remain out of scope
  until the one-to-one product demonstrates sustained value.
