# OpenFriend Phase 1 Live Conversation Implementation Plan

> **For Codex:** REQUIRED SUB-SKILL: Use
> `superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Let Andrew start, interrupt, inspect, and end one truthful browser
Realtime conversation using a short-lived server-minted credential.

**Architecture:** Keep the long-lived OpenAI key in the Next.js server route.
The browser requests a short-lived Realtime client secret, then uses the official
OpenAI Agents SDK and its WebRTC transport through one replaceable adapter. A
pure reducer owns the user-visible lifecycle. The React surface owns microphone
intent, transcript presentation, and coarse connection/response latency
diagnostics. No conversation data is persisted.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript, Vitest, Testing
Library, OpenAI Agents SDK `0.13.5`, Realtime WebRTC, `gpt-realtime-2.1-mini`,
and `gpt-realtime-2.1`.

---

## Accepted story

> As Andrew at my computer, I can grant microphone access and begin an
> interruptible Realtime conversation, so that I can judge whether OpenFriend
> feels fluid enough to take onto the Watch.

Acceptance:

- a server route creates a short-lived Realtime client secret;
- the standard OpenAI API key never enters a browser response, bundle, log, or
  fixture;
- the UI truthfully exposes idle, connecting, live, reconnecting, ended, and
  failed states;
- natural VAD interruption works through the SDK's WebRTC transport and a manual
  stop-speaking control calls the SDK interruption primitive;
- the UI shows an in-memory transcript plus connection and latest-response
  latency diagnostics;
- ending or failing a session closes the SDK session and browser media tracks;
- tests, static checks, the production build, and one real-browser conversation
  pass before the phase is called complete.

## Non-goals

- No profile-comparison records, cost estimation, auth, database, memory,
  background operator, tool calls, Watch transport, or conversation persistence.
- No generic provider framework or custom WebRTC signaling.
- No indefinite retry loop. One automatic reconnect attempt is the maximum.
- No transcript or raw audio in server logs, analytics, or durable storage.

## Current official API decisions

- Use `POST /v1/realtime/client_secrets`; do not use the obsolete
  `/v1/realtime/sessions` flow.
- Use `@openai/agents/realtime` and `RealtimeSession.connect({ apiKey })`; the
  browser transport is WebRTC automatically.
- Configure the chosen model in the server-created Realtime session.
- Keep VAD enabled so WebRTC interruption truncates unplayed model audio.
- Use `RealtimeSession.interrupt()` for the explicit stop-speaking control and
  `RealtimeSession.close()` for cleanup.
- Use SDK history and transport events rather than parsing raw data-channel
  protocol events in React.

## Task 0: Close the Phase 0 evidence gap

**Files:**

- Modify: `AGENTS.md`
- Modify later: `README.md`
- Modify later: `docs/PLANS.md`
- Modify later: `docs/QUALITY_SCORE.md`

1. Reproduce the current CI failure with `pnpm docs:check`.
2. Keep the Claude/Fable, Codex, public-repository, and account policies intact
   while reducing `AGENTS.md` to the enforced 80-line budget.
3. Run `pnpm verify`; commit the focused repair.
4. Open the Phase 1 pull request so GitHub runs the same gate on Linux.
5. Only after the remote check and deployed browser evidence pass, mark Phase 0
   completed and publication passing. Do not backfill evidence early.

## Task 1: Model the live-session lifecycle

**Files:**

- Create: `apps/web/lib/live-session-state.test.ts`
- Create: `apps/web/lib/live-session-state.ts`

1. Write a reducer test for `idle -> connecting -> live -> ended`.
2. Run `pnpm --filter @openfriend/web test -- live-session-state.test.ts` and
   observe RED because the reducer does not exist.
3. Implement only the states and events required by that test.
4. Add RED tests for connection failure and one
   `live -> reconnecting -> live` recovery.
5. Add a RED test that a second connection loss becomes `failed`, preventing an
   infinite retry loop.
6. Implement the smallest immutable reducer that passes.
7. Run the focused tests and commit:

   ```bash
   git add apps/web/lib/live-session-state.*
   git commit -m "feat: model live conversation states"
   ```

## Task 2: Mint short-lived client secrets server-side

**Files:**

- Create: `apps/web/app/api/realtime/client-secret/route.test.ts`
- Create: `apps/web/app/api/realtime/client-secret/route.ts`

1. Write a route test that requests the Economy profile and expects one fetch to
   `https://api.openai.com/v1/realtime/client_secrets` with the server
   `OPENAI_API_KEY`, `expires_after`, and `gpt-realtime-2.1-mini`.
2. Observe RED because the route does not exist.
3. Implement the smallest POST route. Validate the profile through
   `@openfriend/contracts`; return only `clientSecret`, `expiresAt`, and `model`.
4. Add RED tests for a missing server key, unknown profile, and sanitized OpenAI
   failure. No upstream body or credential may reach the response.
5. Make those tests pass without logging secrets or request content.
6. Run the focused route tests and commit:

   ```bash
   git add apps/web/app/api/realtime/client-secret
   git commit -m "feat: mint realtime client secrets"
   ```

## Task 3: Wrap the official Realtime SDK

**Files:**

- Modify: `apps/web/package.json`
- Modify: `pnpm-lock.yaml`
- Create: `apps/web/lib/live-session.ts`
- Create: `apps/web/lib/openai-live-session.test.ts`
- Create: `apps/web/lib/openai-live-session.ts`

1. Add `@openai/agents@0.13.5` to `@openfriend/web`.
2. Define the smallest app-facing session interface: connect, interrupt, close,
   lifecycle updates, history updates, and response-start updates.
3. Write RED adapter tests with an injected SDK-session factory.
4. Implement `OpenAILiveSession` around `RealtimeAgent` and `RealtimeSession`.
   Map SDK connection/history events to the app interface; do not expose raw
   protocol events to React.
5. Verify interrupt delegates to `session.interrupt()` and close is idempotent.
6. Run focused tests, typecheck, and commit:

   ```bash
   git add apps/web/package.json pnpm-lock.yaml apps/web/lib
   git commit -m "feat: add realtime session adapter"
   ```

## Task 4: Build the browser voice lab

**Files:**

- Modify: `apps/web/app/page.test.tsx`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/components/live-profile-selector.tsx`
- Modify: `apps/web/components/live-profile-selector.test.tsx`
- Create: `apps/web/components/live-conversation-lab.test.tsx`
- Create: `apps/web/components/live-conversation-lab.tsx`

1. Write a component test that starts in idle, selects Economy, requests a client
   secret only after Andrew clicks, and announces connecting then live.
2. Observe RED before adding the component.
3. Implement start and end with an injected session factory. Fetch credentials
   only from the server route; never accept a standard API key as a prop.
4. Add RED tests for transcript rendering, connection latency, response latency,
   manual interruption, a single reconnecting attempt, sanitized failure, and
   cleanup on end/unmount.
5. Implement each behavior one test at a time.
6. Replace Phase 0's disabled control with the lab while preserving truthful
   accessible status and the pre-session profile choice.
7. Apply the existing visual language at 320 px and desktop without turning the
   page into a dashboard.
8. Run component tests, typecheck, lint, and commit:

   ```bash
   git add apps/web/app apps/web/components
   git commit -m "feat: add browser voice lab"
   ```

## Task 5: Verify, review, and publish the phase

**Files:**

- Modify: `README.md`
- Modify: `docs/PLANS.md`
- Modify: `docs/QUALITY_SCORE.md`
- Modify if behavior changed: `docs/ARCHITECTURE.md`
- Modify if behavior changed: `docs/SECURITY.md`
- Modify: this plan

1. Run `pnpm verify` from the isolated worktree.
2. Scan the complete tracked/untracked diff for secrets and personal data.
3. Start the app with the existing fresh server-side `OPENAI_API_KEY`.
4. In a real browser, verify:
   - the key never appears in HTML, client JavaScript, console, or network
     responses other than the short-lived `ek_...` client secret;
   - microphone denial produces a useful failed state;
   - allow microphone, connect, speak, hear a reply, interrupt naturally, invoke
     manual interruption, inspect transcript/latency, and end;
   - 320 px and desktop have no horizontal overflow or inaccessible controls.
5. Ask Claude Fable/high for a bounded read-only review of the diff, security
   boundary, SDK usage, and acceptance evidence.
6. Codex evaluates and implements accepted findings, then reruns focused tests
   and `pnpm verify`.
7. Push the branch, obtain green GitHub CI, and verify the personal Vercel
   preview corresponds to the reviewed commit.
8. Update Phase 0/Phase 1 status and evidence truthfully, commit, push, and merge
   only when all required checks pass.

### Current verification evidence

On 2026-07-26:

- focused reducer, route, adapter, and component tests pass;
- the server successfully mints the expected short-lived Realtime client secret
  without returning the standard API key;
- the refreshed Preview credential passes a minimal Responses API request with
  `200` and creates a Realtime WebRTC call with `201`;
- a full Realtime data-channel turn using the server-minted client secret
  received the exact model reply `realtime works`, resolving the earlier
  provider-quota blocker;
- the real browser voice sequence remains pending because macOS can enumerate
  the available microphones but cannot open an input stream: direct
  `getUserMedia({ audio: true })` calls time out in Chrome, Safari remains
  connecting after microphone permission is granted, and an independent
  AVFoundation capture also hangs;
- Chrome's site permission is allowed and its permission details enumerate all
  four inputs, while WebRTC internals records unresolved `getUserMedia` calls
  and media internals never creates an input controller;
- restarting Chrome's audio helper, selecting a virtual input, and toggling the
  built-in microphone sample rate do not restore capture, so restarting the
  system `coreaudiod` service was the next required gate;
- while Andrew was away from the computer, the local-only synthetic Realtime
  harness bypassed hardware capture without adding a production route or fake
  microphone control: a local proxy to the development client-secret route and
  the real Agents SDK WebRTC transport connected in `734 ms`, transcribed
  `Hello open friend, please tell me one cheerful sentence about today.`, began
  the model response `1,068 ms` after fixture playback ended, received the
  server's `output_audio_buffer.cleared` acknowledgement after manual
  interruption, and closed cleanly;
- that synthetic result validates the provider, credential, WebRTC,
  transcription, response, explicit interruption, and cleanup path, but does
  not validate real microphone capture, audio processing, device switching, or
  natural VAD barge-in; the reported run required an explicit input-buffer
  commit, so it is provisional evidence rather than Phase 1 completion;
- Andrew restarted `coreaudiod`; the process ID changed and an independent
  two-second AVFoundation capture from the MacBook Air microphone then opened
  at `48 kHz` and completed normally;
- a fresh local Chrome session using the physical microphone connected,
  captured several human conversation turns, showed finalized user and
  assistant transcripts, naturally truncated multiple assistant replies when
  Andrew spoke over them, stopped a long reply through the explicit Interrupt
  control, and ended cleanly;
- that real session exposed a faulty `1–20 ms` response diagnostic: finalized
  transcription could arrive after response creation, so it was the wrong clock
  boundary; focused red/green tests now anchor the metric on
  `input_audio_buffer.speech_stopped` and consume it at
  `output_audio_buffer.started`;
- after that repair, a fresh physical-microphone session connected in
  `1,064 ms`, transcribed the clearly synthetic acoustic prompt `What is one
cheerful thing about today?`, displayed the assistant reply, measured
  `389 ms` from server-detected speech stop to first output audio, and ended
  cleanly;
- `pnpm verify` passes with 57 web tests and 6 contract tests, plus typecheck,
  lint, formatting, documentation, and production-build gates;
- GitHub CI passes on reviewed commit `1a3696a`;
- Claude Fable/high approved the final lifecycle hardening with no actionable
  P0/P1 finding after the requested timing-guard coverage was added;
- personal Vercel preview
  [openfriend-admyt5p2y-andrewsiah-stripe.vercel.app](https://openfriend-admyt5p2y-andrewsiah-stripe.vercel.app)
  is `READY` on `1a3696a`;
- the deployed page shows the reviewed `Voice response start` diagnostic at
  both 320 px and desktop widths without horizontal overflow, and its only
  recorded console errors came from the browser-control extension rather than
  the application.

The local real-browser conversation gate passes. The reviewed repair is pushed,
GitHub CI and the personal Vercel preview pass on that commit, and the final
status documents record the result. This implementation plan is complete;
Phase 1 continues with the separate profile-comparison story.

## Stop condition

Stop after one real, interruptible, non-persistent browser conversation and the
documented quality gates pass. The next story is profile comparison; do not
begin it inside this plan.
