import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import test from "node:test";
import { fileURLToPath } from "node:url";

const checkerPath = fileURLToPath(
  new URL("./check-architecture.mjs", import.meta.url),
);
const temporaryRoots = [];

async function createRepository(files) {
  const root = await mkdtemp(path.join(tmpdir(), "openfriend-architecture-"));
  temporaryRoots.push(root);

  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, contents);
  }

  return root;
}

function runChecker(root) {
  return spawnSync(process.execPath, [checkerPath, "--root", root], {
    encoding: "utf8",
  });
}

function assertActionableFailure(result, expectedPath, expectedRule) {
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, new RegExp(expectedPath.replaceAll("/", "\\/")));
  assert.match(result.stderr, new RegExp(`\\[${expectedRule}\\]`));
  assert.match(result.stderr, /Remediation:/);
}

test.after(async () => {
  await Promise.all(
    temporaryRoots.map((root) => rm(root, { recursive: true, force: true })),
  );
});

test("packages cannot import application implementation", async () => {
  const root = await createRepository({
    "apps/web/lib/session.ts": "export const session = {};\n",
    "packages/operator/src/index.ts":
      'import { session } from "../../../apps/web/lib/session";\nexport { session };\n',
  });

  const result = runChecker(root);

  assertActionableFailure(
    result,
    "packages/operator/src/index.ts",
    "packages-no-app-imports",
  );
});

test("packages cannot import application implementation through its workspace name", async () => {
  const root = await createRepository({
    "apps/web/package.json": '{"name":"@openfriend/web"}\n',
    "apps/web/app/page.tsx":
      "export default function Page() { return null; }\n",
    "packages/operator/src/index.ts":
      'import Page from "@openfriend/web/app/page";\nexport { Page };\n',
  });

  const result = runChecker(root);

  assertActionableFailure(
    result,
    "packages/operator/src/index.ts",
    "packages-no-app-imports",
  );
});

test("contracts reject framework, runtime, and application imports", async () => {
  const root = await createRepository({
    "apps/web/lib/session.ts": "export const session = {};\n",
    "packages/contracts/src/index.ts": [
      'import type { ReactNode } from "react";',
      'import type { NextRequest } from "next/server";',
      'import { readFile } from "node:fs/promises";',
      'import { session } from "../../../apps/web/lib/session";',
      "export type View = ReactNode;",
      "export { readFile, session };",
      "export type Request = NextRequest;",
    ].join("\n"),
  });

  const result = runChecker(root);
  const matches = result.stderr.match(/\[contracts-runtime-independent\]/g);

  assertActionableFailure(
    result,
    "packages/contracts/src/index.ts",
    "contracts-runtime-independent",
  );
  assert.equal(matches?.length, 4);
});

test("browser components reject explicit server-only imports and routes", async () => {
  const root = await createRepository({
    "apps/web/app/api/realtime/route.ts": "export function POST() {}\n",
    "apps/web/lib/credentials.server.ts": "export const credential = {};\n",
    "apps/web/components/conversation.tsx": [
      'import { POST } from "../app/api/realtime/route";',
      'import { credential } from "../lib/credentials.server";',
      "export function Conversation() {",
      "  return null;",
      "}",
      "void POST;",
      "void credential;",
    ].join("\n"),
  });

  const result = runChecker(root);
  const matches = result.stderr.match(/\[client-server-boundary\]/g);

  assertActionableFailure(
    result,
    "apps/web/components/conversation.tsx",
    "client-server-boundary",
  );
  assert.equal(matches?.length, 2);
});

test("use-client modules reject named server secrets", async () => {
  const root = await createRepository({
    "apps/web/features/conversation.ts": [
      '"use client";',
      "export const credential = process.env.OPENAI_API_KEY;",
    ].join("\n"),
  });

  const result = runChecker(root);

  assertActionableFailure(
    result,
    "apps/web/features/conversation.ts",
    "client-server-boundary",
  );
  assert.match(result.stderr, /OPENAI_API_KEY/);
});

test("semicolonless use-client modules reject server-only imports", async () => {
  const root = await createRepository({
    "apps/web/lib/credentials.server.ts": "export const credential = {};\n",
    "apps/web/features/conversation.ts": [
      '"use client"',
      'import { credential } from "../lib/credentials.server";',
      "export { credential };",
    ].join("\n"),
  });

  const result = runChecker(root);

  assertActionableFailure(
    result,
    "apps/web/features/conversation.ts",
    "client-server-boundary",
  );
});

test("commented-out imports do not create architecture violations", async () => {
  const root = await createRepository({
    "packages/operator/src/index.ts": [
      '// import { page } from "../../../apps/web/app/page";',
      "export const active = true;",
    ].join("\n"),
  });

  const result = runChecker(root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Architecture check passed/);
});

test("production code and configuration reject the deprecated live model", async () => {
  const root = await createRepository({
    "apps/web/config/live-models.json": '{"economy":"gpt-realtime-mini"}\n',
  });

  const result = runChecker(root);

  assertActionableFailure(
    result,
    "apps/web/config/live-models.json",
    "deprecated-live-model",
  );
});

test("allows intended boundaries and ignores generated or test artifacts", async () => {
  const root = await createRepository({
    "packages/contracts/src/profile.ts":
      'export const model = "gpt-realtime-2.1-mini";\n',
    "packages/contracts/src/index.ts": 'export { model } from "./profile";\n',
    "packages/operator/src/index.ts":
      'import { model } from "@openfriend/contracts";\nexport { model };\n',
    "apps/web/lib/browser.ts": "export const browserValue = true;\n",
    "apps/web/components/conversation.tsx": [
      'import { browserValue } from "../lib/browser";',
      "export function Conversation() {",
      "  return browserValue ? null : null;",
      "}",
    ].join("\n"),
    "packages/contracts/src/forbidden.test.ts":
      'import React from "react";\nvoid React;\n',
    "packages/operator/fixtures/forbidden.ts":
      'import "../../../apps/web/lib/browser";\n',
    "apps/web/tests/forbidden.ts":
      '"use client";\nvoid process.env.OPENAI_API_KEY;\n',
    "apps/web/.next/generated.ts":
      'export const model = "gpt-realtime-mini";\n',
    "apps/web/dist/generated.ts": 'export const model = "gpt-realtime-mini";\n',
    "node_modules/example/index.js":
      'export const model = "gpt-realtime-mini";\n',
    ".worktrees/other/packages/example/src/index.ts":
      'import "../../../../../apps/web/lib/browser";\n',
  });

  const result = runChecker(root);

  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /Architecture check passed/);
});
