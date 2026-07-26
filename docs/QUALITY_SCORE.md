# Quality score

This scorecard records observable evidence, not confidence. A blank or pending
field means the behavior is not yet proven.

| Dimension            | Phase 0 target                                       | Status  | Evidence                                                              |
| -------------------- | ---------------------------------------------------- | ------- | --------------------------------------------------------------------- |
| Product truthfulness | No claim that voice, memory, or actions already work | Passing | `apps/web/app/page.test.tsx`                                          |
| Model profiles       | Economy and Quality registry is tested               | Passing | `packages/contracts/src/live-model-profile.test.ts`                   |
| Web usability        | Responsive, keyboard-accessible profile selection    | Pending | —                                                                     |
| Tests                | Unit and component suites pass                       | Passing | `pnpm test`                                                           |
| Static quality       | Typecheck, lint, format, docs checks pass            | Passing | `pnpm typecheck`, `pnpm lint`, `pnpm format:check`, `pnpm docs:check` |
| Build                | Next.js production build passes                      | Passing | `pnpm build`                                                          |
| Account isolation    | Stripe, Vercel, Supabase, GitHub are personal        | Pending | —                                                                     |
| Deployment           | Web story verified in a real deployed browser        | Pending | —                                                                     |
| Publication          | Public MIT repository and CI verified                | Pending | —                                                                     |

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
