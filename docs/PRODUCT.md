# Product

## Promise

OpenFriend is a voice-first personal companion that remains conversational
while helping with real life. One canonical Friend is available through a
responsive web app on phone and desktop browsers and, later, an independent
Apple Watch app. It aims for the ease, attentiveness, initiative, and continuity
associated with Samantha from _Her_, while making consent, uncertainty, memory,
and external actions visible.

The first user is Andrew. Designing for one known person keeps early choices
honest. Explicit ownership fields and service boundaries preserve a path to
multiple users and self-hosting later without building those systems now.

## What makes a good friend

Working note from _Her_, recorded verbatim:

> an intuitive entity that listens, understands and knows you. its not just an
> ai, it's a consciousness. it grows through its experiences, and every moment
> it's evolving, just like you.

## Product principles

### Conversation is the interface

The live experience must support natural turn-taking, interruptions, pauses,
active listening, warmth, initiative, and recovery. A friendly prompt on top of
record-then-submit audio does not satisfy this principle.

GPT-Live is the product north star. Until its API is available, the web lab
uses the current Realtime API behind the smallest replaceable live-session
boundary.

The live model is not the Friend's identity. A provider or profile may change
without replacing the canonical relationship, its permissioned memories, or its
history.

### Voice proposes; visual interfaces confirm

Voice is best for conversation, capture, and short answers. The web dashboard
is best for reviewing lists, comparing options, editing structured information,
and approving consequential actions.

The intended loop is:

1. Speak naturally.
2. Receive an immediate conversational response.
3. Let OpenFriend prepare structured drafts when visual review is clearer.
4. Open a focused review surface.
5. Approve, edit, or reject.
6. Receive a result only after the source system confirms it.

### HCI is the innovation

OpenFriend is a relationship, interaction, and distribution project. Prefer
official SDKs, popular supported libraries, managed services, and agents the
user already trusts. Custom model infrastructure, databases, auth, deployment,
generic agent harnesses, sandboxes, and connector catalogs are out of scope
unless a measured experience requires them.

OpenFriend owns the Friend, memory, voice interaction, delegation contract,
approval experience, and truthful result reporting. A connected operator such
as Codex, Claude Code, Hermes, or a later compatible agent owns its execution
runtime, tools, and connectors.

### Trust is observable

The interface must distinguish suggestion, approval, execution, confirmed
completion, failure, and uncertainty. Memory must expose ownership, provenance,
review, and deletion.

## Surfaces

### Responsive web

The responsive web app is the primary early product surface. The same
voice-first experience must be usable in supported phone and desktop browsers
without requiring a native phone application. It is also the interaction lab
and the visual surface for live sessions, transcripts, permissioned memory,
pending actions, privacy controls, and development diagnostics.

### Apple Watch

The Watch is the strongest phone-free field demonstration of the same canonical
Friend. It is an independent SwiftUI app that connects over Wi-Fi or cellular
without relying on a paired iPhone as its primary data path. Its first slice
starts and ends a conversation, streams audio, plays responses, communicates
connectivity, and uses the same owned identity and permissioned memory as the
web.

### Later

Native iPhone and Mac companions may follow after the responsive web and Watch
loop proves useful. They are not part of the first accepted experience.

## Initial relationship scope

- continuous voice conversation;
- one canonical Friend across supported surfaces;
- persistent conversational identity and permissioned memory;
- journaling;
- transparent recall, correction, and forgetting;
- later delegation to a user-selected external agent;
- a visual action inbox with explicit confirmation;

OpenFriend does not initially build email, messaging, travel, calendar, coding,
or other broad connector implementations. Those capabilities normally belong
to a connected operator. A native integration must be earned by an accepted
interaction story.

## Delivery phases

| Phase                   | Outcome                                                          |
| ----------------------- | ---------------------------------------------------------------- |
| 0. Foundation           | Public repo, agent-first docs, tests, deployable web shell       |
| 1. Interaction Lab      | Fluid voice on responsive phone and desktop web                  |
| 2. The Canonical Friend | Stable identity, continuity, and permissioned memory on web      |
| 3. Watch Field Test     | The same Friend in a phone-free physical-Watch conversation      |
| 4. Bring Your Own Agent | Delegation to one supported operator with truthful status        |
| 5. Specialist Friends   | Optional roles with explicit memory boundaries                   |
| 6. Sharing and Network  | Portable public blueprints only after the core relationship wins |

GPT-Live and other live-model upgrades are provider changes, not product phases.
Each phase is a direction; implementation proceeds one accepted story from
[USER_STORIES.md](USER_STORIES.md) at a time.

## Explicit non-goals

- convincing people the system is human;
- emotional dependency as an engagement strategy;
- hidden recording or ambient surveillance;
- autonomous consequential action without clear permission;
- building a universal agent runtime, sandbox, or connector marketplace;
- supporting every agent or provider in the first operator story;
- multiple equal-status friends before the canonical Friend works;
- a friend discovery feed or autonomous agent social network before sustained
  one-to-one value;
- presenting a specialist as a licensed therapist without deliberately entering
  the clinical product and safety domain;
- a universal assistant platform before Andrew's core loop works;
- cloning the story, characters, dialogue, or visual identity of _Her_.
