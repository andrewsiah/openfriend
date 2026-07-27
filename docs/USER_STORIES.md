# User stories

Stories are ordered by the experience they unlock. Infrastructure work belongs
inside the smallest story that needs it.

## Accepted: Phase 0 foundation

> As Andrew and a future contributor, I can open the public OpenFriend
> repository and deployed web shell, understand exactly what is being built,
> choose between the accepted economy and quality Realtime profiles, and run
> the documented quality gates, so that voice and Watch experiments can begin
> from a trustworthy shared foundation.

Acceptance:

- agent-first docs describe the full-duplex companion and operator;
- TDD, YAGNI, and user-story-driven development are enforceable guidance;
- the profile registry exposes Economy and Quality without deprecated models;
- the web shell truthfully states that voice is not connected;
- the independent Watch target builds and tests a truthful idle state without
  audio, networking, signing, or a Phase 2 claim;
- local checks, personal infrastructure ownership, deployment, and public repo
  state are verified.

## In progress: Phase 1 web voice lab

### Start a live conversation

> As Andrew at my computer, I can grant microphone access and begin an
> interruptible Realtime conversation, so that I can judge whether OpenFriend
> feels fluid enough to take onto the Watch.

Acceptance:

- ephemeral credentials are created server-side;
- the browser communicates connecting, live, reconnecting, ended, and failed
  states;
- Andrew can interrupt a response naturally;
- no long-lived provider credential reaches the browser;
- transcript and latency diagnostics support evaluation.

### Compare economy and quality

> As Andrew testing conversational feel, I can start otherwise equivalent
> sessions with Economy and Quality, so that I can compare quality, latency, and
> cost.

Acceptance:

- profile selection happens before a session;
- switching ends the old session and creates a new one;
- evaluation records profile, latency, qualitative score, and estimated cost;
- missing capabilities are disclosed.

Implementation status: the guided, session-only comparison and its automated
quality gates pass. A local unattended pair has also passed against real
Economy and Quality Realtime WebRTC sessions, including three transcribed turns
per profile, natural interruption, usage, latency, recordings, and cleanup.
Andrew's human 1–5 ratings, real paired-microphone acceptance, deployed-browser
acceptance, and the deferred Fable/high review are still required before this
story moves to accepted.

## Then: Phase 2 Watch field test

### Talk without the phone

> As Andrew leaving home without my phone, I can start a conversation from my
> Watch over cellular and hear OpenFriend respond, so that the companion remains
> available while I am out.

Acceptance:

- independent Watch authentication uses a short-lived credential;
- live audio works without the paired iPhone data path;
- connection and delegated-work status are glanceable;
- Wi-Fi, cellular, noise, and reconnection scenarios pass on the physical Watch.

### Hand detailed review to the web

> As Andrew speaking on my Watch, I can send a structured draft to a web review
> page and later approve, edit, or reject it, so that voice stays natural
> without making visual work tedious or unsafe.

Acceptance:

- the Watch acknowledges the draft without reading every field aloud;
- the web opens the exact draft;
- no external write occurs before the accepted approval state;
- status remains consistent across surfaces.

## Later

Phase 3 stories cover identity, journaling, and permissioned memory. Phase 4
covers background delegation and native tasks. Phase 5 begins with Google
Calendar. New connectors and platforms are added only as accepted stories.
