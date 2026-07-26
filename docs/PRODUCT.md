# Product

## Promise

OpenFriend is a personal companion that remains conversational while helping
with real life. It aims for the ease, attentiveness, initiative, and continuity
associated with Samantha from _Her_, while making consent, uncertainty, and
external actions visible.

The first user is Andrew. Designing for one known person keeps early choices
honest. Explicit ownership fields and service boundaries preserve a path to
multiple users and self-hosting later without building those systems now.

## Product principles

### Conversation is the interface

The live experience must support natural turn-taking, interruptions, pauses,
active listening, warmth, initiative, and recovery. A friendly prompt on top of
record-then-submit audio does not satisfy this principle.

GPT-Live is the product north star. Until its API is available, the web lab
uses the current Realtime API behind the smallest replaceable live-session
boundary.

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

OpenFriend is an application and distribution project. Prefer official SDKs,
popular supported libraries, and managed services. Custom model infrastructure,
databases, auth, deployment, and generic agent harnesses are out of scope unless
measured experience demands them.

### Trust is observable

The interface must distinguish suggestion, approval, execution, confirmed
completion, failure, and uncertainty. Memory must expose ownership, provenance,
review, and deletion.

## Surfaces

### Web

The web app is the voice-development lab and visual command center. It will
eventually contain live sessions, profile selection, transcripts, tasks,
journals, memory, pending actions, calendar views, integrations, privacy
controls, and development diagnostics.

### Apple Watch

The Watch is the priority field surface. It is an independent SwiftUI app that
connects over Wi-Fi or cellular without relying on a paired iPhone as its
primary data path. Its first slice starts and ends a conversation, streams
audio, plays responses, communicates connectivity, shows short results, and
hands detailed review to the web.

### Later

iPhone and Mac companions may follow after the web-to-Watch loop proves useful.
They are not part of the first accepted experience.

## Initial life-admin scope

- continuous voice conversation;
- persistent conversational identity and permissioned memory;
- journaling;
- OpenFriend-native tasks;
- a visual action inbox with explicit confirmation;
- Google Calendar after the Watch experience is validated.

Email, messaging, travel, and broad connector work are intentionally deferred.

## Delivery phases

| Phase               | Outcome                                                      |
| ------------------- | ------------------------------------------------------------ |
| 0. Foundation       | Public repo, agent-first docs, tests, deployable web shell   |
| 1. Web Voice Lab    | Repeatably fluid Realtime conversation and diagnostics       |
| 2. Watch Field Test | Useful phone-free conversation on a physical Watch           |
| 3. The Friend       | Identity, journaling, continuity, permissioned memory        |
| 4. The Operator     | Delegation, task drafts, review, approval, execution         |
| 5. Connectors       | Google Calendar first; others story by story                 |
| 6. GPT-Live         | Adopt the API and evaluate additional live/operator profiles |

The Watch follows the first working browser voice loop; connectors do not block
it.

## Explicit non-goals

- convincing people the system is human;
- emotional dependency as an engagement strategy;
- hidden recording or ambient surveillance;
- autonomous consequential action without clear permission;
- a universal assistant platform before Andrew's core loop works;
- cloning the story, characters, dialogue, or visual identity of _Her_.
