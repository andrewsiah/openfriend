# Quality score

This scorecard records observable evidence, not confidence. A blank or pending
field means the behavior is not yet proven.

| Dimension            | Phase 0 target                                       | Status  | Evidence                                                                    |
| -------------------- | ---------------------------------------------------- | ------- | --------------------------------------------------------------------------- |
| Product truthfulness | No claim that voice, memory, or actions already work | Passing | `apps/web/app/page.test.tsx`                                                |
| Model profiles       | Economy and Quality registry is tested               | Passing | `packages/contracts/src/live-model-profile.test.ts`                         |
| Web usability        | Responsive, keyboard-accessible profile selection    | Passing | Deployed browser checks at 390 px and 320 px                                |
| Tests                | Unit and component suites pass                       | Passing | `pnpm test`                                                                 |
| Static quality       | Typecheck, lint, format, docs checks pass            | Passing | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm docs:check`       |
| Build                | Next.js production build passes                      | Passing | `pnpm build`                                                                |
| Account isolation    | Stripe, Vercel, Supabase, GitHub are personal        | Passing | Stripe Projects status and Vercel scope inspection                          |
| Deployment           | Web story verified in a real deployed browser        | Passing | [Vercel preview](https://openfriend-8dst6mpnm-andrewsiah-stripe.vercel.app) |
| Publication          | Public MIT repository and CI verified                | Pending | —                                                                           |

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

Phase 1 adds conversation naturalness, interruption, latency, and cost. Phase 2
adds the physical Watch network matrix from [TESTING.md](TESTING.md).

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

Known limitations:

- this is a preview, not a production deployment;
- voice remains intentionally disconnected until Phase 1;
- GitHub CI is not proven until the public repository is pushed.
