# Phase 1 Profile Comparison Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a guided, browser-memory-only paired experiment that compares
otherwise equivalent Economy and Quality voice sessions on perceived quality,
latency, and estimated cost.

**Architecture:** Extend the existing Realtime adapter with sanitized usage
events, calculate dated model-cost estimates in a pure web module, and keep
completed evaluation summaries in the mounted voice-lab component. Preserve the
current explicit microphone lifecycle: preparing another profile never starts a
session automatically.

**Tech Stack:** Next.js App Router, React 19, TypeScript, OpenAI Agents SDK
Realtime events, Vitest, Testing Library, CSS.

---

## Boundaries

- Do not add persistence, Supabase, PostHog, n8n, analytics, or a generalized
  evaluation framework.
- Do not store transcripts in saved comparison summaries.
- Do not expose provider credentials, upstream bodies, or raw provider events.
- Do not claim cost is exact; rate-date and transcription limitations remain
  visible.
- Do not begin Watch networking, memory, tools, or operator work.

### Task 1: Model usage and estimated cost

**Files:**

- Create: `apps/web/lib/live-session-evaluation.ts`
- Create: `apps/web/lib/live-session-evaluation.test.ts`

1. Write failing pure-function tests for:
   - Economy and Quality text/audio/cached token arithmetic;
   - aggregation of repeated SDK usage details;
   - cached modality tokens being subtracted from modality totals before
     uncached pricing;
   - conservative pricing of unknown tokens;
   - unavailable cost when no usage event or only a zero-usage event was
     received;
   - median latency for odd, even, missing, and invalid samples.
2. Run:
   `pnpm --filter @openfriend/web test -- live-session-evaluation.test.ts`
   and confirm the module-not-found RED.
3. Add narrow `LiveTokenUsage`, profile-specific dated price data, aggregation,
   `estimateLiveSessionCostUsd`, and `medianLatencyMs` implementations.
4. Use the official 2026-07-26 per-million-token rates from the
   [Economy model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1-mini)
   and
   [Quality model page](https://developers.openai.com/api/docs/models/gpt-realtime-2.1):
   - Economy text input/cached/output: `0.60 / 0.06 / 2.40`; audio
     input/cached/output: `10 / 0.30 / 20`.
   - Quality text input/cached/output: `4 / 0.40 / 24`; audio
     input/cached/output: `32 / 0.40 / 64`.
5. Re-run the focused test and confirm GREEN.
6. Commit:

   ```bash
   git add apps/web/lib/live-session-evaluation.ts apps/web/lib/live-session-evaluation.test.ts
   git commit -m "feat: calculate live session evaluation metrics"
   ```

### Task 2: Expose sanitized Realtime usage

**Files:**

- Modify: `apps/web/lib/live-session.ts`
- Modify: `apps/web/lib/openai-live-session.ts`
- Modify: `apps/web/lib/openai-live-session.test.ts`

1. Write failing adapter tests proving `usage_update` maps SDK usage into the
   narrow app shape and the listener is removed exactly once on close.
2. Run:
   `pnpm --filter @openfriend/web test -- openai-live-session.test.ts` and
   confirm the callback/listener expectations fail.
3. Add `LiveUsageUpdate` and `onUsageUpdate` to `LiveSessionCallbacks`.
4. Subscribe to the transport's typed `usage_update` event. Runtime-guard the
   nested `cached_tokens_details` object even though the installed SDK's public
   `Usage` detail type flattens it to `Record<string, number>`. Cached tokens are
   subsets, not additions: calculate uncached text as `text_tokens -
cached_text_tokens` and uncached audio as
   `audio_tokens - cached_audio_tokens`, clamped at zero. Derive cached-unknown,
   uncached-unknown, and output-unknown counts from provider totals without
   exposing the raw event. Accept only finite non-negative counts.
5. Detach the exact listener during idempotent close.
6. Run the focused adapter tests, typecheck, and lint; confirm GREEN.
7. Commit:

   ```bash
   git add apps/web/lib/live-session.ts apps/web/lib/openai-live-session.ts apps/web/lib/openai-live-session.test.ts
   git commit -m "feat: expose realtime session usage"
   ```

### Task 3: Build the guided paired workflow

**Files:**

- Modify: `apps/web/components/live-conversation-lab.tsx`
- Modify: `apps/web/components/live-conversation-lab.test.tsx`

1. Add failing component tests for:
   - the fixed guide remaining identical across profile runs;
   - collecting every response-start sample and displaying its median;
   - accumulating usage updates for the current run;
   - requiring End and a 1–5 rating before Save;
   - saving profile, latency, score, usage, and estimate without transcript;
   - preparing the other profile by clearing session UI and selecting it
     without calling `connect`;
   - rendering both summaries side by side after the second save;
   - showing unavailable values rather than fabricated zeros;
   - clearing all evaluation state and closing media on comparison reset.
2. Run the focused component tests and confirm the expected RED.
3. Add component-local draft and saved-summary state. Replace the single
   response-start value with a run-local sample list while preserving the live
   latest-value readout.
4. Render the fixed ordered guide, ended-run rating group, Save result,
   Prepare other profile, two-profile summary, rate-date/estimate disclosure,
   current capability disclosure, and Reset comparison control.
5. Keep profile controls disabled whenever the session is not idle. A prepared
   run still requires the existing explicit Start button.
6. Re-run focused tests and confirm GREEN.
7. Commit:

   ```bash
   git add apps/web/components/live-conversation-lab.tsx apps/web/components/live-conversation-lab.test.tsx
   git commit -m "feat: compare economy and quality sessions"
   ```

### Task 4: Integrate the responsive presentation

**Files:**

- Modify: `apps/web/app/globals.css`
- Modify: `apps/web/app/page.tsx`
- Modify: `apps/web/app/page.test.tsx`

1. Write failing page/static behavior assertions for the comparison story and
   truthful sequence into the Watch field test.
2. Run the focused page test and confirm RED.
3. Add restrained guide, scoring, result-card, and comparison-table styles that
   collapse to one column at narrow widths.
4. Update page copy so profile comparison is visibly the remaining Phase 1
   story and Watch remains next after it.
5. Run page/component tests, typecheck, lint, and format; confirm GREEN.
6. Commit:

   ```bash
   git add apps/web/app/globals.css apps/web/app/page.tsx apps/web/app/page.test.tsx
   git commit -m "feat: present the paired voice experiment"
   ```

### Task 5: Update the system of record

**Files:**

- Modify: `README.md`
- Modify: `docs/ARCHITECTURE.md`
- Modify: `docs/PLANS.md`
- Modify: `docs/QUALITY_SCORE.md`
- Modify: `docs/TESTING.md`
- Modify: `docs/USER_STORIES.md`
- Modify: `docs/plans/2026-07-26-phase-1-profile-comparison.md`

1. Document the in-memory evaluation boundary, usage/cost estimate semantics,
   pricing date, transcription and in-flight-End limitations, fixed guide, and
   teardown rules.
2. Link this plan under Active while work continues.
3. Run `pnpm docs:check` and `pnpm format:check`.
4. Request one bounded Claude Fable/high review of the integrated diff. Resolve
   actionable P0/P1 findings with focused regression tests.
5. Commit:

   ```bash
   git add README.md docs
   git commit -m "docs: explain live profile comparison"
   ```

### Task 6: Verify the real paired experiment

1. Run `pnpm verify` and require every test, typecheck, lint, format, docs, and
   production-build gate to pass.
2. Scan the complete branch diff for credential-shaped values without printing
   any matches.
3. Start the web app with the ignored server-side `OPENAI_API_KEY`.
4. In a real Chrome session with the physical microphone:
   - run Economy through all three guide steps;
   - end, rate, save, and prepare Quality;
   - confirm the old session is closed and Start is still required;
   - run Quality through the same three guide steps;
   - end, rate, and save;
   - verify both summaries show profile, connection latency, median response
     start, quality score, usage, and estimated cost;
   - reset and confirm media and comparison state are cleared.
5. Verify 320 px and desktop layouts, keyboard controls, and no
   application-sourced console error.
6. Record evidence in `docs/QUALITY_SCORE.md` and this plan.
7. Push the branch, open a pull request, and require GitHub CI and the personal
   Vercel preview to pass before integration.

## Stop condition

Stop after one real paired Economy/Quality experiment and all documented gates
pass. Do not start the Watch field test inside this plan.
