# Synthetic Paired Voice Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Run the accepted three-step guide through real Economy and Quality Realtime WebRTC sessions without requiring Andrew to speak live, and leave temporary recordings for later human rating.

**Architecture:** Extend the existing local-only synthetic harness rather than adding a production route. A pure paired runner provides one immutable guide to sequential profile runs; each browser run injects generated speech into `OpenAIRealtimeWebRTC`, reuses `OpenAILiveSession` for sanitized application events, and records the remote assistant stream in memory.

**Tech Stack:** TypeScript, Vitest, Vite, macOS `say`, Web Audio, MediaStream, MediaRecorder, OpenAI Agents SDK Realtime WebRTC.

---

### Task 1: Model paired synthetic evidence

**Files:**

- Modify: `apps/web/tests/synthetic-voice/result.test.ts`
- Modify: `apps/web/tests/synthetic-voice/result.ts`

**Step 1: Write the failing tests**

Add tests proving:

- a paired result requires Economy and Quality exactly once and in that order;
- both runs must report three finalized synthetic user turns;
- connection, assistant transcript, audio response, natural interruption,
  response latency, provider usage, non-empty recording, and clean close are
  mandatory;
- a failure names the incomplete profile;
- limitations explicitly exclude physical microphone and browser speech
  processing.

**Step 2: Run the tests to verify RED**

Run:

```bash
pnpm --filter @openfriend/web exec vitest run tests/synthetic-voice/result.test.ts
```

Expected: FAIL because the paired evidence types and evaluator do not exist.

**Step 3: Implement the smallest evaluator**

Add narrow immutable profile and pair evidence shapes plus
`evaluateSyntheticPairedVoiceRun`. Keep recorded bytes rather than Blob objects
in JSON evidence.

**Step 4: Run the focused tests to verify GREEN**

Run the same Vitest command and require every test to pass.

**Step 5: Commit**

```bash
git add apps/web/tests/synthetic-voice/result.ts apps/web/tests/synthetic-voice/result.test.ts
git commit -m "test: define synthetic paired voice evidence"
```

### Task 2: Enforce one guide and sequential profiles

**Files:**

- Create: `apps/web/tests/synthetic-voice/paired-run.test.ts`
- Create: `apps/web/tests/synthetic-voice/paired-run.ts`

**Step 1: Write the failing orchestration tests**

Define the wished-for `runSyntheticProfilePair` API and prove:

- it calls Economy before Quality;
- the same immutable three-step guide is passed to both;
- Quality does not begin before Economy resolves;
- a profile failure stops the pair and preserves the profile name.

**Step 2: Run the tests to verify RED**

Run:

```bash
pnpm --filter @openfriend/web exec vitest run tests/synthetic-voice/paired-run.test.ts
```

Expected: FAIL because `paired-run.ts` does not exist.

**Step 3: Implement the minimal runner**

Export the exact accepted guide and a sequential async runner with no retry or
parallel abstraction.

**Step 4: Run the focused tests to verify GREEN**

Run the same Vitest command and require every test to pass.

**Step 5: Commit**

```bash
git add apps/web/tests/synthetic-voice/paired-run.ts apps/web/tests/synthetic-voice/paired-run.test.ts
git commit -m "feat: sequence synthetic profile runs"
```

### Task 3: Run and record real paired Realtime sessions

**Files:**

- Modify: `apps/web/tests/synthetic-voice/run.mjs`
- Modify: `apps/web/tests/synthetic-voice/main.ts`
- Modify: `apps/web/tests/synthetic-voice/index.html`

**Step 1: Generate the accepted fixtures**

Replace the two generic phrases with temporary 16 kHz PCM WAV files for the
exact three-step guide. Keep the temporary-directory teardown.

**Step 2: Add the real profile runner**

For each profile:

- create one Web Audio input destination;
- create a muted output element and record its remote stream;
- create `OpenAILiveSession` with an injected real SDK session and synthetic
  WebRTC transport;
- collect sanitized history and usage callbacks;
- measure connection and response-start latency;
- wait for the first response to complete;
- play the second prompt, then play the redirect after its output begins;
- require a natural output-clear interruption and the final response;
- close the session, stop tracks, close AudioContext, and finalize recording.

Use observable event/predicate waits with bounded timeouts. Do not use fixed
sleep as the completion condition.

**Step 3: Present temporary A/B recordings**

Run the pure pair orchestrator from one button. Render sanitized JSON evidence
plus labeled Economy and Quality `<audio controls>` and download links backed by
in-memory Blob URLs. Revoke old URLs before another run.

**Step 4: Run static verification**

Run:

```bash
pnpm --filter @openfriend/web test
pnpm --filter @openfriend/web typecheck
pnpm --filter @openfriend/web lint
```

Expected: PASS.

**Step 5: Commit**

```bash
git add apps/web/tests/synthetic-voice
git commit -m "feat: automate paired realtime speech"
```

### Task 4: Verify the real harness and update evidence

**Files:**

- Modify: `docs/README.md`
- Modify: `docs/PLANS.md`
- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/USER_STORIES.md`
- Modify: `docs/plans/2026-07-26-phase-1-profile-comparison.md`

**Step 1: Run the complete local gate**

Run `pnpm verify` and require all checks and the production build to pass.

**Step 2: Run the browser harness**

Start the web app with the ignored server-side key on port 3010, run
`pnpm --filter @openfriend/web test:synthetic-voice`, and use a real Chromium
browser to start the pair. Require both profiles, three user turns each,
natural interruption, usage, cost, recordings, and clean close.

**Step 3: Listen and rate**

Leave both temporary audio controls available. Mark human quality pending until
Andrew listens and supplies a 1–5 rating for each; never invent scores.

**Step 4: Update the system of record**

Document the new automated acceptance boundary, exact evidence, limitations,
and remaining asynchronous rating. Keep the original physical-microphone
evidence separate.

**Step 5: Review and publish**

Request a bounded Fable/high review when its usage limit is restored; until
then, record Andrew's explicit deferral. Inspect the complete public diff,
secret-scan without printing matches, commit documentation, push the existing
branch, and require GitHub CI and Vercel to pass.

## Stop condition

Stop after a real synthetic paired run passes and both recordings are available
for Andrew. Do not claim perceived quality or begin Watch implementation until
the recordings are rated and the deferred review is resolved or explicitly
waived.
