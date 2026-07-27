# Contributing to OpenFriend

OpenFriend is personal-first and built in public. Contributions that improve the
accepted user journey, conversation quality, Watch usefulness, privacy, or
trust are welcome.

## Before coding

1. Read [AGENTS.md](AGENTS.md) and [docs/README.md](docs/README.md).
2. Choose or propose a concrete story ID in
   [docs/USER_STORIES.md](docs/USER_STORIES.md).
3. Confirm the story is Accepted and agree on observable acceptance criteria
   before implementation.
4. Write a checked-in plan for multi-step work.

Please open an issue before a large connector, provider, platform, or
architecture addition. YAGNI is intentional: popularity alone does not make a
dependency part of OpenFriend.

## Development

```bash
pnpm install
pnpm verify
```

Use test-driven development for behavior:

1. add one focused failing test;
2. confirm the expected failure;
3. add the smallest implementation;
4. make the focused and relevant suites pass;
5. refactor while green.

Keep commits narrow. Update the system-of-record docs when behavior or a durable
decision changes.

## Pull requests

Include:

- the stable user story ID;
- acceptance criteria;
- red/green and final verification evidence;
- screenshots or recordings when interface behavior changes;
- security, privacy, cost, and Watch implications;
- known limitations.

Do not include secrets, personal conversation data, or company resources.
OpenFriend development must use personal or isolated contributor-owned
accounts.

By participating, you agree to the [Code of Conduct](CODE_OF_CONDUCT.md).
