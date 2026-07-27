# Profile Comparison Design

## Story

> As Andrew testing conversational feel, I can start otherwise equivalent
> sessions with Economy and Quality, so that I can compare quality, latency, and
> cost.

The comparison remains a live conversation, not a benchmark dashboard. It
should help Andrew notice whether the higher-priced model earns its place
without pretending a single short run is statistically conclusive.

## Chosen approach

Use a guided paired experiment in the existing voice lab.

1. Show one short, fixed conversation guide for both profiles.
2. Run one profile at a time through the existing explicit Start and End
   controls.
3. After End, record the profile, connection latency, median voice-response
   start, provider-reported usage, estimated cost, and Andrew's 1–5 overall
   quality score.
4. Prepare the other profile without starting its microphone automatically.
5. Show the two session summaries side by side after both are rated.

This is preferable to telemetry alone, which cannot measure perceived quality,
and to a fully scripted audio benchmark, which is reproducible but weak at
judging conversational warmth, turn-taking, and interruption.

## Equivalent conversation guide

Both sessions use the same visible guide:

1. Say: “I've had a long day. Help me reset in one minute.”
2. Say: “Help me choose between a quiet evening and seeing friends. Ask me one
   question before advising.”
3. While OpenFriend answers, redirect it: “Actually, make that practical: give
   me one next step.”

The guide checks warmth, instruction following, turn-taking, and interruption
without injecting text into the provider session or changing the normal
microphone path.

## State and privacy

Comparison state lives only in the mounted React component. It contains summary
metrics and the selected score, not transcript text. Reloading the page clears
it. No Supabase table, browser storage, cookie, analytics event, or public API
route is added.

The active session keeps its existing lifecycle. Profile controls stay locked
while connecting or live. Saving an ended run closes over that run's profile
and metrics. Preparing the other profile clears the transcript and live
diagnostics, selects the other profile, and returns to idle; the next explicit
Start mints a new credential and creates a new Realtime session. There is no
in-place model mutation and no automatic microphone restart.

## Metrics

- **Connection:** the existing client Start-to-connected duration.
- **Voice response start:** the median of every valid
  server-speech-stopped-to-output-audio-start sample in the run.
- **Usage:** provider-reported Realtime response token totals and modality
  details emitted by the installed OpenAI Agents SDK.
- **Estimated cost:** a client-side calculation using the published
  `gpt-realtime-2.1-mini` and `gpt-realtime-2.1` text, cached-input, and audio
  token rates as of 2026-07-26. The primary sources are the official
  [Economy model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
  and
  [Quality model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1).
- **Quality:** Andrew's required 1–5 overall score after End.

The provider's cached counts are subsets of its input modality totals. The
calculator therefore subtracts cached text and audio from their respective
totals before applying uncached rates; it never adds cached counts on top of
the totals. It prices uncached text, cached text, uncached audio, cached audio,
output text, and output audio separately when the provider supplies the
breakdown. Unknown tokens use the higher applicable audio rate so the estimate
does not silently understate cost. A zero-only or absent usage report is
unavailable rather than a free session. The UI labels the amount as an
estimate, dates the rates, and discloses that separately billed transcription,
a response still in flight when End is pressed, or future provider charges may
be absent.

## Capability disclosure

The comparison states that both current profiles expose the live lab's
full-duplex audio, interruption, and tool-use capabilities. It also states that
this experiment does not evaluate memory, connectors, or Watch behavior. If the
profile registry later records a capability difference, the comparison must
render it rather than hiding it.

## Error handling

- A failed or still-active run cannot be saved as a completed comparison.
- A run without provider usage remains rateable, but cost displays as
  unavailable rather than zero.
- Missing latency samples display as unavailable and do not become zero.
- Reset comparison closes any active session, clears both saved summaries, and
  returns to the Economy idle state.
- Existing sanitized connection failures and teardown rules remain unchanged.

## Accessibility and responsive behavior

The guide is an ordered list. Quality scoring uses a labeled radio group.
Summary values use semantic table or definition-list markup, with explicit
profile names instead of color alone. The comparison must work without
horizontal scrolling at the supported 320 px minimum and must preserve focus
movement for Start, End, preparation, and reset transitions.

## Verification

TDD covers cost arithmetic, unknown-token fallback, usage-event teardown,
median latency, required rating, profile preparation, summary rendering,
comparison reset, and missing metrics. The complete `pnpm verify` gate must
pass. Manual acceptance uses the same guide for both real physical-microphone
sessions, confirms a fresh provider session for each profile, records both
summary cards, and checks the deployed page at 320 px and desktop widths.
