# Synthetic paired voice design

## Story

> As Andrew evaluating OpenFriend without staying at the microphone, I can run
> the same synthetic spoken guide through Economy and Quality and later listen
> to each response recording, so that transport, latency, usage, cost, and
> conversational differences can be compared without live speech.

## Acceptance

- one explicit action runs Economy and then Quality, never concurrently;
- both profiles receive the same three generated speech fixtures;
- the run uses the development client-secret route, production Realtime
  adapter, Agents SDK, WebRTC transport, transcription, model audio, usage
  events, and close lifecycle;
- the third fixture begins during the second assistant response and natural
  interruption is observed;
- each result includes connection latency, median response-start latency,
  sanitized usage, estimated cost, transcript evidence, and a non-empty
  assistant-audio recording;
- the page presents temporary Economy and Quality audio controls for later
  human rating;
- generated fixtures and response recordings remain temporary and are never
  committed;
- failure closes the active session and media tracks and identifies which
  profile failed.

## Architecture

The existing local-only synthetic harness remains separate from production
routes. Its macOS runner generates the accepted three-step guide with `say` and
serves the fixtures from a temporary directory. Browser Web Audio decodes each
fixture and publishes it as a `MediaStream`, which becomes the input track of a
real `OpenAIRealtimeWebRTC` transport.

The harness creates `OpenAILiveSession` with an injected SDK-session factory.
This preserves the production history, usage, connection, and cleanup mapping
while allowing the harness to retain the transport for event-level orchestration
and the remote output stream for recording. A small pure paired runner enforces
Economy-then-Quality ordering and passes one immutable guide to both runs.

Each profile waits on observable lifecycle conditions rather than fixed
conversation-length delays. The first prompt completes before the second
begins. The third prompt starts after output audio begins for the second prompt,
testing natural barge-in. The run completes only after three finalized synthetic
user turns, the final assistant response, usage, audio output, and a clean
close.

## Evidence boundary

This experiment replaces live human speech for the profile-comparison
transport run. It does not prove physical microphone capture, device switching,
echo cancellation, noise suppression, or automatic gain control. Existing
physical-microphone evidence remains separate.

Automated results do not fabricate perceived quality. The harness records both
assistant outputs and leaves each score pending until Andrew listens and rates
the clips. A model-based judge may be added only as separately labeled
provisional evidence; it is not part of this design.
