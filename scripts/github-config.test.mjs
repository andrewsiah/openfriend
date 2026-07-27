import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

async function readRepositoryFile(relativePath) {
  try {
    return await readFile(path.join(repositoryRoot, relativePath), "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      assert.fail(
        `${relativePath} is required by the public security baseline`,
      );
    }

    throw error;
  }
}

function actionReferences(workflow) {
  return Array.from(
    workflow.matchAll(/^\s*uses:\s*([^\s#]+)\s*$/gm),
    (match) => match[1],
  );
}

function topLevelBlock(workflow, key) {
  const match = workflow.match(
    new RegExp(`^${key}:\\s*\\n((?:^[ \\t].*(?:\\n|$)|^\\s*$\\n)*)`, "m"),
  );

  assert.ok(match, `${key} must be a top-level workflow mapping`);
  return match[1];
}

function dependencyUpdateBlock(config, ecosystem) {
  const blocks = config.split(/\n(?=\s{2}- package-ecosystem:)/);
  const block = blocks.find((candidate) =>
    candidate.includes(`package-ecosystem: "${ecosystem}"`),
  );

  assert.ok(block, `Dependabot must configure the ${ecosystem} ecosystem`);
  return block;
}

function assertWeeklyGroupedUpdates(block, label) {
  assert.match(block, /schedule:\s*\n\s+interval: "weekly"/);
  assert.match(
    block,
    /cooldown:\s*\n(?:\s+.*\n)*?\s+default-days: \d+/,
    `${label} updates must use a cooldown`,
  );
  assert.match(
    block,
    /groups:\s*\n(?:\s+.*\n)*?\s+patterns:\s*\n\s+- "\*"/,
    `${label} updates must be grouped`,
  );
}

test("Dependabot groups weekly pnpm dependency updates with a cooldown", async () => {
  const config = await readRepositoryFile(".github/dependabot.yml");
  const npmUpdates = dependencyUpdateBlock(config, "npm");

  assert.match(npmUpdates, /directory: "\/"/);
  assertWeeklyGroupedUpdates(npmUpdates, "pnpm");
});

test("Dependabot groups weekly GitHub Actions updates with a cooldown", async () => {
  const config = await readRepositoryFile(".github/dependabot.yml");
  const actionsUpdates = dependencyUpdateBlock(config, "github-actions");

  assert.match(actionsUpdates, /directory: "\/"/);
  assertWeeklyGroupedUpdates(actionsUpdates, "GitHub Actions");
});

test("dependency review is a deterministic pull-request-only read-only check", async () => {
  const workflow = await readRepositoryFile(
    ".github/workflows/dependency-review.yml",
  );
  const triggers = topLevelBlock(workflow, "on");
  const permissions = topLevelBlock(workflow, "permissions");

  assert.match(triggers, /^\s{2}pull_request:\s*$/m);
  assert.doesNotMatch(triggers, /^\s{2}(push|schedule|workflow_dispatch):/m);
  assert.match(permissions, /^\s{2}contents: read\s*$/m);
  assert.doesNotMatch(permissions, /^\s{2}(?!contents:)[\w-]+:/m);
  assert.match(
    workflow,
    /^\s{4}name: Dependency Review\s*$/m,
    "the job check name must remain stable for branch protection",
  );
  assert.ok(
    actionReferences(workflow).includes(
      "actions/dependency-review-action@v5.0.0",
    ),
    "dependency review must use the current Node 24-compatible action",
  );
  assert.match(workflow, /fail-on-severity: moderate/);
});

test("CI uses current Node 24-compatible action releases", async () => {
  const workflow = await readRepositoryFile(".github/workflows/ci.yml");
  const references = actionReferences(workflow);

  assert.ok(references.includes("actions/checkout@v7.0.1"));
  assert.ok(references.includes("pnpm/action-setup@v6.0.9"));
  assert.ok(references.includes("actions/setup-node@v7.0.0"));
});
