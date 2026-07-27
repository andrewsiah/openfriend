# Contributing to OpenFriend

OpenFriend is personal-first and built in public. Contributions that improve the
accepted user journey, conversation quality, Watch usefulness, privacy, or
trust are welcome.

## Before coding

1. Read [AGENTS.md](AGENTS.md) and [docs/README.md](docs/README.md).
2. Choose or propose a concrete story in
   [docs/USER_STORIES.md](docs/USER_STORIES.md).
3. Agree on observable acceptance criteria before a broad implementation.
4. Write a checked-in plan for multi-step work.

Please open an issue before a large connector, provider, platform, or
architecture addition. YAGNI is intentional: popularity alone does not make a
dependency part of OpenFriend.

## Development

```bash
pnpm install --frozen-lockfile
pnpm verify
pnpm test:browser
```

Use test-driven development for behavior:

1. add one focused failing test;
2. confirm the expected failure;
3. add the smallest implementation;
4. make the focused and relevant suites pass;
5. refactor while green.

Keep commits narrow. Update the system-of-record docs when behavior or a durable
decision changes.

`pnpm verify` is the integrated unit, static, documentation, architecture, and
build gate. `pnpm test:browser` drives the real conversation component through
a deterministic mock session without provider credentials, microphone access,
or external network calls. Real Realtime voice checks are manual and may incur
provider charges; follow the setup and teardown instructions in
[docs/TESTING.md](docs/TESTING.md).

Use clearly synthetic names, conversations, payloads, screenshots, and logs in
this public repository. Never copy production data or personal conversations
into tests, issues, pull requests, or CI artifacts. Run
`pnpm maintenance:report` when changing repository guardrails or quality
documentation; its findings are informational and should be assessed rather
than hidden.

## Pull requests

Include:

- the user story;
- acceptance criteria;
- red/green and final verification evidence;
- screenshots or recordings when interface behavior changes;
- security, privacy, cost, and Watch implications;
- known limitations.

Pull requests targeting `main` must pass `verify`, the read-only Dependency
Review, and Greptile Review. Greptile re-reviews after every pushed commit and
must report at least `4/5` confidence. Resolve each actionable review comment or
reply with the verified reason it is not actionable; automated review is
evidence, not a substitute for judgment. Do not weaken or bypass a failed
security check to merge.

Pull requests over 100 changed files do not receive an automatic Greptile
review. Split them into reviewable changes or explicitly request a complete
review by commenting `@greptileai`; the missing required check blocks merge
until that review finishes.

Do not include secrets, personal conversation data, or company resources.
OpenFriend development must use personal or isolated contributor-owned
accounts.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
Report suspected vulnerabilities through the private process in the
[security policy](SECURITY.md), never through a public issue.
