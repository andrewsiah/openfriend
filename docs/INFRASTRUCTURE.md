# Infrastructure

OpenFriend uses managed personal development resources. Stripe Projects is the
source of truth for supported service topology and credentials; provider CLIs
are used only to verify ownership or perform work the Projects catalog does not
cover.

## Current development topology

| Provider        | Project resource     | Tier                            | Personal ownership evidence                                                   |
| --------------- | -------------------- | ------------------------------- | ----------------------------------------------------------------------------- |
| Stripe Projects | `openfriend`         | Development/default environment | Andrew's verified personal Stripe account                                     |
| Supabase        | `supabase`           | Free                            | Created by `theandrewsiah@gmail.com` in the personal org linked by Stripe     |
| Vercel          | `web` / `openfriend` | Hobby                           | Created by `theandrewsiah@gmail.com` under personal scope `andrewsiah-stripe` |

No production environment, paid plan, billing upgrade, or company resource is
part of the project.

Ready Homes and every other company Supabase organization or Vercel team are
prohibited. The standalone Supabase CLI currently exposes a company org and
must not be used for OpenFriend. Provider ownership must be rechecked before a
new resource, migration, deployment, or paid change.

## Stripe Projects workflow

Use the CLI, never direct file inspection:

```bash
stripe projects llm-context
stripe projects status --json
stripe projects catalog <provider> --json
stripe projects env --json
```

The active environment is `default`, with ignored output at `.env`. Never open
or hand-edit `.env` or files beneath `.projects`; the CLI owns them.

Provisioning used exact catalog services in this order:

1. Supabase Free plan: `supabase/free`
2. Supabase database/auth/storage project: `supabase/project`
3. Vercel Hobby plan: `vercel/hobby`
4. Vercel web project: `vercel/project`

The CLI-managed project state is committed only where the CLI's generated
ignore policy identifies it as safe. Vault, cache, local test state, and
environment outputs remain ignored.

## Environment-variable names

Stripe Projects currently manages these names:

### Supabase

- `SUPABASE_DB_PASS`
- `SUPABASE_DB_URL`
- `SUPABASE_POOLER_URL`
- `SUPABASE_PROJECT_REF`
- `SUPABASE_PROJECT_URL`
- `SUPABASE_PUBLISHABLE_KEY`
- `SUPABASE_ORG_SLUG`
- `SUPABASE_PLAN`

### Vercel

- `VERCEL_PLAN`
- `VERCEL_TEAM_ID`
- `VERCEL_TEAM_URL`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`
- `VERCEL_PROJECT_LINK`
- `VERCEL_PROJECT_URL`
- `VERCEL_TOKEN`

These are provider outputs, not permission for browser code to receive every
value. Application code consumes only the minimum variables required by an
accepted story.

## OpenAI

OpenAI is not available in the Stripe Projects catalog as of 2026-07-26.
`OPENAI_API_KEY` will be a server-only project variable when Phase 1 begins.

The key previously shared in chat must be treated as exposed and rotated. Store
only a fresh replacement through the CLI's secure interactive prompt:

```bash
stripe projects variables set openai --env-key OPENAI_API_KEY
```

Do not put the value on the command line, in `.env.example`, or in Git.

### Watch authentication

The authenticated Watch credential route reads these server-only names:

- `OPENFRIEND_WATCH_APPLE_AUDIENCE`
- `OPENFRIEND_WATCH_ALLOWED_APPLE_SUBJECT`
- `OPENFRIEND_WATCH_SAFETY_HMAC_KEY`
- `OPENAI_API_KEY`

Store populated values only in approved personal secret stores. The Apple
subject and keyed-hash material must never appear in Git, documentation, logs,
client bundles, or Watch storage. The local route implementation and tests do
not authorize deployment, public route exposure, WAF changes, preview
protection changes, or live Apple/OpenAI calls.

## Deployment

Stripe Projects created the personal Vercel project. Its project root is
`apps/web`, while deployments upload the repository root so pnpm can resolve
the workspace contracts package. SSO deployment protection is disabled for this
public, credential-free foundation shell; Git fork protection remains enabled.

The current
[public preview](https://openfriend-8dst6mpnm-andrewsiah-stripe.vercel.app)
completed its remote production build and passed the deployed browser story.
Detailed evidence is recorded in [QUALITY_SCORE.md](QUALITY_SCORE.md).

The preview is not a production promotion. Git-based deployments remain pending
until the repository is published from the personal GitHub account.
