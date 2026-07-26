import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";

import {
  AGENTS_LINE_BUDGET,
  REQUIRED_DOCS,
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
