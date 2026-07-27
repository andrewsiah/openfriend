# Quality score

This scorecard records observable evidence, not confidence. A blank or pending
field means the behavior is not yet proven.

| Dimension            | Phase 0 target                                       | Status  | Evidence                                                                       |
| -------------------- | ---------------------------------------------------- | ------- | ------------------------------------------------------------------------------ |
| Product truthfulness | No claim that voice, memory, or actions already work | Passing | `apps/web/app/page.test.tsx`                                                   |
| Model profiles       | Economy and Quality registry is tested               | Passing | `packages/contracts/src/live-model-profile.test.ts`                            |
| Web usability        | Responsive, keyboard-accessible profile selection    | Passing | Deployed browser checks at 390 px and 320 px                                   |
| Tests                | Unit and component suites pass                       | Passing | `pnpm test`                                                                    |
| Static quality       | Typecheck, lint, format, docs checks pass            | Passing | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm docs:check`          |
| Build                | Next.js production build passes                      | Passing | `pnpm build`                                                                   |
| Watch readiness      | Unsigned simulator state test and build pass         | Passing | `xcodebuild test`, `xcodebuild build`, watchOS 26.2                            |
| Account isolation    | Stripe, Vercel, Supabase, GitHub are personal        | Passing | Stripe Projects status and Vercel scope inspection                             |
| Deployment           | Web story verified in a real deployed browser        | Passing | [Vercel preview](https://openfriend-8dst6mpnm-andrewsiah-stripe.vercel.app)    |
| Publication          | Public MIT repository and CI verified                | Passing | [GitHub repository](https://github.com/andrewsiah/openfriend), CI on `1a3696a` |

## Evidence format

For manual evidence, record:

- date and environment;
- user story and scenario;
- expected and actual result;
- command, deployment, or device used;
- known limitations and next action.

Do not convert a pending row to passing from code inspection alone when the
target names a build, deployment, account, browser, conversation, or physical
device.

## Phase 1 live-conversation score

| Dimension             | Phase 1 target                                            | Status  | Evidence                                                                    |
| --------------------- | --------------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| Provider boundary     | Mint a short-lived client secret without exposing API key | Passing | Route tests and real Realtime WebRTC connection                             |
| Physical microphone   | Capture a real human turn in Chrome                       | Passing | MacBook Air microphone session on 2026-07-26                                |
| Conversation          | Finalized user and assistant transcripts                  | Passing | Multi-turn physical-microphone session                                      |
| Natural interruption  | Speaking over the assistant truncates playback            | Passing | Multiple human barge-in turns in the physical-microphone session            |
| Explicit interruption | Interrupt control stops an active response                | Passing | Long acoustic-prompt response stopped and remained stopped                  |
| Latency telemetry     | Measure connection and speech-stop-to-audio-start timing  | Passing | `1,064 ms` connection and `389 ms` voice response start                     |
| Session lifecycle     | End closes the live session cleanly                       | Passing | Browser status: `Ended. The live conversation is closed.`                   |
| Automated quality     | Complete local and remote gates pass                      | Passing | `pnpm verify`; 57 web tests, 6 contract tests, GitHub CI on `1a3696a`       |
| Deployment            | Reviewed build is ready and usable at supported widths    | Passing | [Vercel preview](https://openfriend-admyt5p2y-andrewsiah-stripe.vercel.app) |
| Review                | Claude Fable/high plan and final code review              | Passing | Final review had no remaining actionable P0/P1 finding                      |

The next Phase 1 story adds quality, latency, and cost comparison between
otherwise equivalent Economy and Quality sessions. Phase 2 then adds the
physical Watch network matrix from [TESTING.md](TESTING.md).

## Phase 1 profile-comparison score

| Dimension           | Target                                                      | Status  | Evidence                                           |
| ------------------- | ----------------------------------------------------------- | ------- | -------------------------------------------------- |
| Equivalent guide    | Both profiles use the same visible three-step conversation  | Passing | `live-conversation-lab.test.tsx`                   |
| Fresh session       | Preparing a profile closes media and never auto-starts mic  | Passing | Component lifecycle tests                          |
| Usage accounting    | Cached tokens are not double-counted                        | Passing | Adapter and pure evaluation tests                  |
| Cost truthfulness   | Dated estimate discloses missing and separate charges       | Passing | Evaluation tests and visible disclosure            |
| Privacy boundary    | Summaries omit transcript and remain mounted-memory-only    | Passing | Component tests and architecture inspection        |
| Automated quality   | Complete local gates pass                                   | Passing | `pnpm verify`; 68 web tests and 6 contract tests   |
| Responsive browser  | Workflow fits 320 px and desktop without application errors | Passing | Local real-browser checks on 2026-07-26            |
| Paired conversation | Real Economy and Quality microphone runs use the same guide | Pending | —                                                  |
| Human quality       | Andrew records a 1–5 score for each real run                | Pending | —                                                  |
| Deployment          | Paired workflow passes deployed browser acceptance          | Pending | —                                                  |
| Final review        | Claude Fable/high finds no actionable P0/P1 issue           | Passing | Structured `APPROVED` verdict on runtime and tests |

The automated rows prove behavior and boundaries, not comparative model
quality. A physical-microphone attempt on 2026-07-26 was stopped when unrelated
room speech reached the microphone; the live session was ended and its mounted
transcript state was reset. The pending rows still require quiet-room paired
sessions and deployed-browser evidence.

## 2026-07-26 deployed foundation evidence

Environment:

- Vercel Preview on personal scope `andrewsiah-stripe`
- Next.js 16.2.12
- Phase 0 static shell with no runtime credentials

Verified in a real browser:

- the page identifies OpenFriend as a full-duplex conversational companion;
- `Foundation ready` and `Voice not connected` are both visible;
- Economy is selected initially with `gpt-realtime-2.1-mini`;
- selecting Quality checks the control and displays `gpt-realtime-2.1`;
- Web Voice Lab appears before Watch Field Test;
- Watch Field Test remains visible at the narrow breakpoint;
- no horizontal overflow occurs at 390 px or the 320 px supported minimum;
- no application-sourced console warning or error was recorded.

The first remote build correctly failed because an app-only upload omitted the
monorepo workspace package. Vercel's project root was set to `apps/web`, the
repository root was linked, and the subsequent preview build completed with
status `READY`.

These Phase 0 limitations were subsequently resolved:

- the repository is public under the personal `andrewsiah` account, detects the
  MIT license, uses `main` as its default branch, and passes GitHub CI;
- Phase 1 connects real browser voice through a server-minted short-lived
  credential;
- the current personal Vercel preview is ready and has been checked at 320 px
  and desktop widths without horizontal overflow.

The deployment evidence is still a branch preview rather than a production
claim.
