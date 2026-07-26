# Napkin

## Corrections

| Date       | Source | What went wrong                                                                                   | What to do instead                                                                                                      |
| ---------- | ------ | ------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| 2026-07-26 | self   | On Vercel CLI 39.1.3, `vercel list --yes` in an unlinked worktree created a project in the default scope. | Treat that command as mutating on old CLI versions. Discover from known links/provider APIs, or upgrade and verify behavior first. |
| 2026-07-26 | self   | Inspecting full Claude process command lines can expose credentials serialized from MCP configuration. | Use PID/status-only process checks, and inspect credential-bearing configuration only through redacted, exact-key queries. |

## User preferences

- Consult Claude Fable/high for plans and high-leverage reviews; Codex implements,
  runs tasks, tests, fixes, and verifies.
- This repository is public. Keep credentials, personal data, and sensitive logs
  out of every tracked file and public surface.
- Use only Andrew's personal provider accounts; never use Ready Homes or another
  company scope.

## Patterns that work

- Keep implementation tasks bounded and sequential when they share code.
- Preserve truthful phase evidence; do not mark a provider or browser gate
  passing from code inspection alone.

## Domain notes

- OpenFriend prioritizes a fluid, interruptible browser conversation before the
  independent Apple Watch field test.
