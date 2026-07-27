# Reliability

OpenFriend must be honest about what it heard, delegated, changed, and could not
confirm.

## Truthful state

Never collapse distinct states into a reassuring success message. Live
conversation, delegated work, approvals, and connectors expose explicit
pending, active, degraded, failed, cancelled, uncertain, and confirmed states
as applicable.

An external action is `completed` only after the source system confirms it.

## Idempotency and retries

- Give delegated jobs and external writes stable identifiers.
- Make connector writes idempotent where the provider supports it.
- Bound retries by count and time.
- Retry only errors known to be safe.
- Do not blindly retry an uncertain write.
- Support cancellation where continuing would surprise the user.

## Live-session resilience

The live companion remains responsive while deeper work runs. Clients expose:

- connecting, connected, reconnecting, degraded, and disconnected states;
- whether audio is being sent or played;
- whether delegated work continues after a transport interruption;
- which profile a new session will use.

Preserve enough server-side session state to reconnect without duplicating
delegated work. Do not claim continuous audio when watchOS or network policy has
suspended it.

The first Watch slice has no server-side conversation or delegated-work state.
Its one allowed reconnect obtains a fresh client secret, creates a new empty
Realtime session, replays no audio or events, and discloses that conversational
continuity may be lost. A failed reconnect or second loss ends and cleans up the
session.

Watch input and unplayed output buffers are bounded. Natural or manual
interruption stops local playback immediately and truncates the assistant item
at audio actually rendered, not audio merely received. Audio-route loss ends
the session rather than silently moving an intimate conversation to the
speaker. Audio interruption, wrist-down suspension, device lock, and network
loss must always change the visible state truthfully.

## Degraded behavior

When a dependency is unavailable:

- state what is unavailable in plain language;
- preserve drafts locally or durably only when safe;
- offer a bounded retry or visual review path;
- avoid filling missing data with guesses;
- keep unrelated capabilities usable when their dependencies remain healthy.

## Observability

Begin with structured identifiers, timestamps, status transitions, latency, and
error categories. Add an observability vendor or queue only when a scheduled
user story needs persistence or operational visibility that current services
cannot provide.

Conversation evaluation includes quality and latency; connector evaluation
includes confirmed effect and duplicate prevention.
