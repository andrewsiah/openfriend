import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";

import { generateMaintenanceReport } from "./maintenance-report.mjs";

const execFileAsync = promisify(execFile);
const maintenanceScript = fileURLToPath(
  new URL("./maintenance-report.mjs", import.meta.url),
);

async function createRepository(files = {}) {
  const root = await mkdtemp(path.join(tmpdir(), "openfriend-maintenance-"));

  for (const [relativePath, content] of Object.entries(files)) {
    const absolutePath = path.join(root, relativePath);
    await mkdir(path.dirname(absolutePath), { recursive: true });
    await writeFile(absolutePath, content);
  }

  return root;
}

test("reports TODO and FIXME markers with stable source locations", async (t) => {
  const root = await createRepository({
    "src/b.ts": `// ${"FIX" + "ME"}: handle recovery\n`,
    "src/a.ts": `// ${"TO" + "DO"}: add validation\nexport const ready = true;\n`,
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(report, /`src\/a\.ts:1` — TODO/);
  assert.match(report, /`src\/b\.ts:1` — FIXME/);
  assert.ok(
    report.indexOf("`src/a.ts:1`") < report.indexOf("`src/b.ts:1`"),
    "locations must use stable path sorting",
  );
  assert.match(report, /TODO\/FIXME markers \| 2/);
  assert.match(report, /Remediation:/);
  assert.doesNotMatch(report, /Generated (?:at|on|for):/);
});

test("does not treat prose about TODO and FIXME markers as work markers", async (t) => {
  const root = await createRepository({
    "docs/guide.md": "The report checks TODO and FIXME markers.\n",
    "src/message.ts": 'export const message = "TODO and FIXME markers";\n',
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(report, /TODO\/FIXME markers \| 0/);
  assert.doesNotMatch(report, /`docs\/guide\.md:1`/);
  assert.doesNotMatch(report, /`src\/message\.ts:1`/);
});

test("reports skipped and focused test markers", async (t) => {
  const skipped = `test.${"skip"}("later", () => {});\n`;
  const focused = `describe.${"only"}("focused", () => {});\n`;
  const root = await createRepository({
    "src/ordinary.ts": "export const skipped = false;\n",
    "tests/session.test.ts": `${skipped}${focused}`,
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /`tests\/session\.test\.ts:1` — skipped test \(test\.skip\)/,
  );
  assert.match(
    report,
    /`tests\/session\.test\.ts:2` — focused test \(describe\.only\)/,
  );
  assert.match(report, /Skipped\/focused tests \| 2/);
});

test("warns above documented production and test file line thresholds", async (t) => {
  const lines = (count) =>
    Array.from({ length: count }, (_, index) => `line ${index + 1}`).join("\n");
  const root = await createRepository({
    "src/large.ts": lines(501),
    "src/at-limit.ts": lines(500),
    "tests/large.test.ts": lines(1001),
    "tests/at-limit.test.ts": lines(1000),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /`src\/large\.ts` — 501 lines \(production warning threshold: 500\)/,
  );
  assert.match(
    report,
    /`tests\/large\.test\.ts` — 1001 lines \(test warning threshold: 1000\)/,
  );
  assert.doesNotMatch(report, /at-limit/);
  assert.match(report, /Oversized files \| 2/);
});

test("reports missing required documentation and security automation", async (t) => {
  const root = await createRepository();
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(report, /`docs\/README\.md` — missing required documentation/);
  assert.match(
    report,
    /`\.github\/workflows\/dependency-review\.yml` — missing required security automation/,
  );
  assert.match(report, /Repository guardrails \| \d+/);
});

test("reports broken relative documentation links with source locations", async (t) => {
  const root = await createRepository({
    "README.md":
      "# Project\n\n[Missing guide](docs/missing.md)\n[Web](https://example.com)\n",
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /`README\.md:3` — broken relative link to `docs\/missing\.md`/,
  );
  assert.doesNotMatch(report, /example\.com/);
});

test("reports pending quality rows and evidence older than 90 days for an explicit date", async (t) => {
  const root = await createRepository({
    "docs/QUALITY_SCORE.md": [
      "| Dimension | Target | Status | Evidence |",
      "| --- | --- | --- | --- |",
      "| Deployment | Public preview | Pending | Waiting for dispatch |",
      "| Browser | Stable story | Passing | Checked 2026-01-01 |",
      "| Recent | Current evidence | Passing | Checked 2026-07-01 |",
      "",
    ].join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root, { date: "2026-07-26" });

  assert.match(report, /Generated for: 2026-07-26/);
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:3` — Pending status for Deployment/,
  );
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:4` — evidence dated 2026-01-01 is 206 days old/,
  );
  assert.doesNotMatch(report, /2026-07-01 is/);
  assert.match(report, /Quality evidence \| 2/);
});

test("excludes dependencies, generated output, worktrees, and test artifacts", async (t) => {
  const excludedDirectories = [
    ".git",
    ".next",
    ".turbo",
    ".worktrees",
    "node_modules",
    "dist",
    "coverage",
    "test-results",
  ];
  const files = Object.fromEntries(
    excludedDirectories.map((directory) => [
      `${directory}/ignored.ts`,
      `// ${"TO" + "DO"}: this generated marker must stay hidden\n`,
    ]),
  );
  const root = await createRepository(files);
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  for (const directory of excludedDirectories) {
    assert.doesNotMatch(
      report,
      new RegExp(`\`${directory.replaceAll(".", "\\.")}/ignored\\.ts`),
    );
  }
  assert.match(report, /TODO\/FIXME markers \| 0/);
});

test("CLI keeps findings informational and rejects invalid arguments or roots", async (t) => {
  const root = await createRepository();
  t.after(() => rm(root, { recursive: true, force: true }));

  const informational = await execFileAsync(process.execPath, [
    maintenanceScript,
    "--root",
    root,
  ]);
  assert.equal(informational.stderr, "");
  assert.match(informational.stdout, /Repository guardrails \| \d+/);

  await assert.rejects(
    execFileAsync(process.execPath, [
      maintenanceScript,
      "--root",
      root,
      "--date",
      "2026-02-30",
    ]),
    (error) =>
      error.code !== 0 &&
      error.stderr.includes("--date must be a valid calendar date"),
  );

  await assert.rejects(
    execFileAsync(process.execPath, [
      maintenanceScript,
      "--root",
      path.join(root, "missing"),
    ]),
    (error) =>
      error.code !== 0 && error.stderr.includes("maintenance report failed"),
  );
});
