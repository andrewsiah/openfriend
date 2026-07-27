import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import { parse } from "yaml";

const repositoryRoot = fileURLToPath(new URL("../", import.meta.url));

const ALLOWED_ACTIONS = new Set([
  "actions/checkout",
  "actions/dependency-review-action",
  "actions/setup-node",
  "pnpm/action-setup",
]);

const FULL_COMMIT_SHA = /^[0-9a-f]{40}$/;
const SEMVER_COMMENT = /^v\d+\.\d+\.\d+$/;

function actionSourcePolicyViolations(source) {
  const violations = [];

  for (const line of source.split(/\r?\n/)) {
    if (!/^\s*(?:-\s+)?uses:/.test(line)) {
      continue;
    }

    const match = line.match(
      /^\s*(?:-\s+)?uses:\s*([^@\s#]+)@([^\s#]+)(?:\s+#\s*(\S+))?\s*$/,
    );

    if (!match) {
      violations.push("workflow action line has unsupported syntax");
      continue;
    }

    const [, action, revision, versionComment] = match;

    if (!ALLOWED_ACTIONS.has(action)) {
      violations.push(`action ${action} is not in the approved allowlist`);
    }

    if (
      !FULL_COMMIT_SHA.test(revision) ||
      !SEMVER_COMMENT.test(versionComment ?? "")
    ) {
      violations.push(
        `action ${action} must use a full 40-character lowercase commit SHA with a same-line semver comment`,
      );
    }
  }

  return violations;
}

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

function actionName(reference) {
  return reference.slice(0, reference.lastIndexOf("@"));
}

function assertPinnedAllowedActions(source, workflow) {
  assert.deepEqual(actionSourcePolicyViolations(source), []);

  const references = actionReferences(workflow);
  assert.ok(references.length > 0, "workflow must use at least one action");

  for (const reference of references) {
    const separator = reference.lastIndexOf("@");
    const action = reference.slice(0, separator);
    const revision = reference.slice(separator + 1);

    assert.ok(
      ALLOWED_ACTIONS.has(action),
      `${action} is not in the approved action allowlist`,
    );
    assert.match(
      revision,
      FULL_COMMIT_SHA,
      `${action} must use a full immutable commit SHA`,
    );
  }

  return references.map(actionName);
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

test("action source policy rejects mutable version tags", () => {
  const workflow = `
jobs:
  verify:
    steps:
      - uses: actions/checkout@v1.2.3 # v1.2.3
`;

  assert.deepEqual(actionSourcePolicyViolations(workflow), [
    "action actions/checkout must use a full 40-character lowercase commit SHA with a same-line semver comment",
  ]);
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
  const source = await readRepositoryFile(
    ".github/workflows/dependency-review.yml",
  );
  const workflow = parseConfiguration(source);
  const job = workflow.jobs?.["dependency-review"];
  const dependencyReviewStep = job?.steps?.find(
    (step) =>
      typeof step.uses === "string" &&
      actionName(step.uses) === "actions/dependency-review-action",
  );
  const actions = assertPinnedAllowedActions(source, workflow);

  assert.deepEqual(Object.keys(workflow.on ?? {}), ["pull_request"]);
  assert.deepEqual(workflow.permissions, { contents: "read" });
  assert.equal(
    job?.name,
    "Dependency Review",
    "the job check name must remain stable for branch protection",
  );
  assert.ok(
    actions.includes("actions/dependency-review-action"),
    "dependency review must use the approved review action",
  );
  assert.equal(dependencyReviewStep?.with?.["fail-on-severity"], "moderate");
});

test("CI uses immutable allowlisted actions and supported repository pnpm", async () => {
  const source = await readRepositoryFile(".github/workflows/ci.yml");
  const workflow = parseConfiguration(source);
  const actions = assertPinnedAllowedActions(source, workflow);
  const packageJson = JSON.parse(await readRepositoryFile("package.json"));
  const packageManager = packageJson.packageManager?.match(
    /^pnpm@(10\.\d+\.\d+)$/,
  );
  const pnpmStep = Object.values(workflow.jobs ?? {})
    .flatMap((job) => job.steps ?? [])
    .find(
      (step) =>
        typeof step.uses === "string" &&
        actionName(step.uses) === "pnpm/action-setup",
    );

  assert.ok(packageManager, "packageManager must declare a stable pnpm 10");
  assert.equal(String(pnpmStep?.with?.version), packageManager[1]);
  assert.ok(actions.includes("actions/checkout"));
  assert.ok(actions.includes("pnpm/action-setup"));
  assert.ok(actions.includes("actions/setup-node"));
});
