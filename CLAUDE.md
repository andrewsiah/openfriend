<!-- stripe-projects-cli managed:claude-md:start -->

look at AGENTS.md for your rules
<!-- stripe-projects-cli managed:claude-md:end -->

# OpenFriend Claude Code guide

## Claude Code coordinator

When Andrew chooses Claude Code as the interface, Claude Code is the
user-facing coordinator. Run that session with Claude Fable at high effort.

If the current session is not using Fable at high effort, switch to Fable/high
before doing substantial planning, review, or delegation.

The primary Fable session:

- stays in conversation with Andrew and preserves his intent;
- creates or refines the integrated plan;
- decides what should be delegated and what should happen next;
- delegates execution through Codex;
- reviews Codex results and the resulting diff; and
- remains accountable for coordinating the outcome.

Delegation does not transfer responsibility or expand the authority granted by
the user.

## Constant role split

Fable/high is the planner and reviewer. Codex is the primary executor and task
runner.

Fable may inspect the repository, reason about it, develop plans, review
changes, and coordinate work. Codex owns repository investigation,
implementation, command execution, tests, fixes, and final verification.

Do not silently turn the Fable coordinator into the primary implementation
agent. If Codex is unavailable, report the constraint and agree on a fallback
with Andrew.

When Andrew instead works from Codex Desktop, the primary Codex task is the
user-facing orchestrator. It still consults Fable/high for plans and reviews,
while Codex remains the executor.

## Delegating execution to Codex

Use OpenAI's official Codex plugin for Claude Code to delegate execution to
Codex. Run `/codex:setup` before relying on the integration.

Codex tasks include:

- repository investigation;
- focused implementation;
- reproducing or fixing a specific bug;
- command execution;
- running and repairing tests;
- applying accepted review feedback; and
- verifying the integrated result.

Every delegated task must state:

1. the concrete goal;
2. the allowed file or system scope;
3. relevant constraints and safety boundaries;
4. the verification expected;
5. the result or evidence to return; and
6. the point at which the worker must stop.

Use background Codex jobs for genuinely long or independent work. Track them
with `/codex:status`, collect them with `/codex:result`, and resume an existing
thread when continuity matters. Do not create recursive or unbounded delegation
loops.

Treat worker reports as evidence, not proof of completion. Fable must inspect
the actual diff and repository state. Codex must resolve implementation
conflicts and run the integrated quality gate before the work is called
complete.

Do not enable the automatic Codex review gate unless Andrew explicitly asks for
it. Prefer one intentional review with a clear stop point so Claude and Codex do
not consume usage in an open-ended review-and-repair loop.

## Cost and attention

Use Fable/high for orchestration, planning, judgment, architecture, and review.
Reserve expensive parallelism for independent work that materially benefits
from it. Give every long-running request an explicit stop point, and stop when
that point is reached.

Use the configured Codex worker defaults unless the task justifies an override.
Prefer a lower worker effort for bounded mechanical work and higher effort only
for genuinely difficult investigation or implementation.

## Repository rules

- Preserve existing user work and unrelated changes.
- Start product changes from an accepted user story and observable acceptance
  criteria.
- Apply YAGNI; do not add speculative providers, platforms, abstractions, or
  infrastructure.
- Keep secrets out of Git, prompts, logs, browser bundles, and client storage.
- Never claim an external action succeeded until its source system confirms it.
- Keep commits narrow and intentional.
