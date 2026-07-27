import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

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

function parseConfiguration(source) {
  const configuration = parse(source);

  assert.ok(
    configuration &&
      typeof configuration === "object" &&
      !Array.isArray(configuration),
    "configuration must be a YAML mapping",
  );

  return configuration;
}

function actionReferences(workflow) {
  return Object.values(workflow.jobs ?? {}).flatMap((job) =>
    (job.steps ?? []).flatMap((step) =>
      typeof step.uses === "string" ? [step.uses] : [],
    ),
  );
}

function dependencyUpdate(config, ecosystem) {
  assert.ok(Array.isArray(config.updates), "Dependabot updates must be a list");
  const update = config.updates.find(
    (candidate) => candidate["package-ecosystem"] === ecosystem,
  );

  assert.ok(update, `Dependabot must configure the ${ecosystem} ecosystem`);
  return update;
}

function assertWeeklyGroupedUpdates(update, label) {
  assert.equal(update.schedule?.interval, "weekly");
  assert.ok(
    Number.isInteger(update.cooldown?.["default-days"]) &&
      update.cooldown["default-days"] > 0,
    `${label} updates must use a positive cooldown`,
  );

  const groups = Object.values(update.groups ?? {});
  assert.ok(
    groups.some((group) => group.patterns?.includes("*")),
    `${label} updates must include a catch-all group`,
  );
}

test("Dependabot groups weekly pnpm dependency updates with a cooldown", async () => {
  const config = parseConfiguration(
    await readRepositoryFile(".github/dependabot.yml"),
  );
  const npmUpdates = dependencyUpdate(config, "npm");

  assert.equal(config.version, 2);
  assert.equal(npmUpdates.directory, "/");
  assertWeeklyGroupedUpdates(npmUpdates, "pnpm");
});

test("configuration validation rejects malformed YAML", () => {
  const malformed = `
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    cooldown:
      default-days: 7
    groups:
      routine:
        patterns:
          - "*"
    broken: [
`;

  assert.throws(() => parseConfiguration(malformed));
});

test("Dependabot groups weekly GitHub Actions updates with a cooldown", async () => {
  const config = parseConfiguration(
    await readRepositoryFile(".github/dependabot.yml"),
  );
  const actionsUpdates = dependencyUpdate(config, "github-actions");

  assert.equal(actionsUpdates.directory, "/");
  assertWeeklyGroupedUpdates(actionsUpdates, "GitHub Actions");
});

test("dependency review is a deterministic pull-request-only read-only check", async () => {
  const workflow = parseConfiguration(
    await readRepositoryFile(".github/workflows/dependency-review.yml"),
  );
  const job = workflow.jobs?.["dependency-review"];
  const dependencyReviewStep = job?.steps?.find(
    (step) => step.uses === "actions/dependency-review-action@v5.0.0",
  );

  assert.deepEqual(Object.keys(workflow.on ?? {}), ["pull_request"]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(
    job?.name,
    "Dependency Review",
    "the job check name must remain stable for branch protection",
  );
  assert.ok(
    actionReferences(workflow).includes(
      "actions/dependency-review-action@v5.0.0",
    ),
    "dependency review must use the current Node 24-compatible action",
  );
  assert.equal(dependencyReviewStep?.with?.["fail-on-severity"], "moderate");
});

test("CI uses current Node 24-compatible action releases", async () => {
  const workflow = parseConfiguration(
    await readRepositoryFile(".github/workflows/ci.yml"),
  );
  const references = actionReferences(workflow);

  assert.ok(references.includes("actions/checkout@v7.0.1"));
  assert.ok(references.includes("pnpm/action-setup@v6.0.9"));
  assert.ok(references.includes("actions/setup-node@v7.0.0"));
});
