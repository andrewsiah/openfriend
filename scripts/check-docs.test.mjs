import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AGENTS_LINE_BUDGET,
  REQUIRED_DOCS,
  REQUIRED_PUBLIC_DOCS,
  validateDocumentation,
} from "./check-docs.mjs";

async function createRepository() {
  const root = await mkdtemp(path.join(tmpdir(), "openfriend-docs-"));

  for (const relativePath of REQUIRED_DOCS) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, "# Document\n");
  }

  await writeFile(path.join(root, "AGENTS.md"), "# Agents\n");
  await writeFile(
    path.join(root, "CONTRIBUTING.md"),
    [
      "# Contributing",
      "",
      "Run `pnpm verify` and `pnpm test:browser`.",
      "Greptile reviews every pull request.",
      "Use synthetic public test data and personal accounts.",
      "Start from an accepted user story and observable acceptance criteria.",
      "Use test-driven development.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(root, "CODE_OF_CONDUCT.md"),
    [
      "# Contributor Covenant Code of Conduct",
      "",
      "Report conduct concerns to `theandrewsiah+openfriend@gmail.com`.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(root, "SECURITY.md"),
    [
      "# Security policy",
      "",
      "Only the latest `main` branch is supported.",
      "Do not open a public issue. Submit a private report at",
      "https://github.com/andrewsiah/openfriend/security/advisories/new.",
      "Never paste a credential into the report.",
      "The project cannot promise a specific response deadline.",
      "",
    ].join("\n"),
  );

  return root;
}

test("reports a missing required system-of-record document", async () => {
  const root = await createRepository();
  const missingPath = REQUIRED_DOCS.at(-1);

  await rm(path.join(root, missingPath));
  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes(missingPath) && error.includes("missing or empty"),
    ),
  );
});

test("reports a broken relative Markdown file link", async () => {
  const root = await createRepository();

  await writeFile(
    path.join(root, "README.md"),
    "# OpenFriend\n\n[Missing guide](docs/MISSING.md)\n",
  );
  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes("README.md") &&
        error.includes("docs/MISSING.md") &&
        error.includes("broken relative link"),
    ),
  );
});

test("reports an AGENTS.md that exceeds the line budget", async () => {
  const root = await createRepository();
  const content = Array.from(
    { length: AGENTS_LINE_BUDGET + 1 },
    (_, index) => `Line ${index + 1}`,
  ).join("\n");

  await writeFile(path.join(root, "AGENTS.md"), content);
  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes("AGENTS.md") &&
        error.includes(`${AGENTS_LINE_BUDGET + 1} lines`) &&
        error.includes(`budget is ${AGENTS_LINE_BUDGET}`),
    ),
  );
});

test("reports a missing public governance document", async () => {
  const root = await createRepository();
  const missingPath = REQUIRED_PUBLIC_DOCS.at(-1);

  await rm(path.join(root, missingPath));
  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes(missingPath) && error.includes("missing or empty"),
    ),
  );
});

test("reports placeholder private-reporting contacts", async () => {
  const root = await createRepository();

  await writeFile(
    path.join(root, "SECURITY.md"),
    [
      "# Security policy",
      "",
      "Only the latest `main` branch is supported.",
      "Do not open a public issue.",
      "Email theandrewsiah+openfriend@gmail.com.",
      "Submit a private report at",
      "https://github.com/example/project/security/advisories/new.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(root, "CODE_OF_CONDUCT.md"),
    [
      "# Contributor Covenant Code of Conduct",
      "",
      "Report conduct concerns to conduct@project.test.",
      "",
    ].join("\n"),
  );

  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes("SECURITY.md") &&
        error.includes("placeholder reporting contact"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("CODE_OF_CONDUCT.md") &&
        error.includes("placeholder reporting contact"),
    ),
  );
});

test("requires the conduct contact in enforcement guidance", async () => {
  const root = await createRepository();

  await writeFile(
    path.join(root, "CODE_OF_CONDUCT.md"),
    [
      "# Contributor Covenant Code of Conduct",
      "",
      "License questions may be sent to license@valid-project.org.",
      "Report conduct concerns through the private project channel.",
      "",
    ].join("\n"),
  );

  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes("CODE_OF_CONDUCT.md") &&
        error.includes("a private enforcement email"),
    ),
  );
});

test("reports omitted contributor and security safeguards", async () => {
  const root = await createRepository();

  await writeFile(
    path.join(root, "CONTRIBUTING.md"),
    [
      "# Contributing",
      "",
      "Run `pnpm verify` and `pnpm test:browser`.",
      "Greptile reviews every pull request.",
      "Use synthetic public test data and personal accounts.",
      "",
    ].join("\n"),
  );
  await writeFile(
    path.join(root, "SECURITY.md"),
    [
      "# Security policy",
      "",
      "Only the latest `main` branch is supported.",
      "Do not open a public issue. Submit a private report at",
      "https://github.com/andrewsiah/openfriend/security/advisories/new.",
      "",
    ].join("\n"),
  );

  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes("CONTRIBUTING.md") &&
        error.includes("accepted user story"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("CONTRIBUTING.md") &&
        error.includes("observable acceptance criteria"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("CONTRIBUTING.md") &&
        error.includes("test-driven development"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("SECURITY.md") &&
        error.includes("credential-pasting warning"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("SECURITY.md") &&
        error.includes("non-guaranteed response expectations"),
    ),
  );
});

test("reports missing public governance requirements", async () => {
  const root = await createRepository();

  await writeFile(path.join(root, "CONTRIBUTING.md"), "# Contributing\n");
  await writeFile(path.join(root, "CODE_OF_CONDUCT.md"), "# Conduct\n");
  await writeFile(path.join(root, "SECURITY.md"), "# Security\n");

  const errors = await validateDocumentation(root);

  assert.ok(
    errors.some(
      (error) =>
        error.includes("CONTRIBUTING.md") &&
        error.includes("missing required guidance"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("CODE_OF_CONDUCT.md") &&
        error.includes("missing required guidance"),
    ),
  );
  assert.ok(
    errors.some(
      (error) =>
        error.includes("SECURITY.md") &&
        error.includes("missing required guidance"),
    ),
  );
});
