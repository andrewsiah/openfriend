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

test("reports TODO markers on decorated block-comment lines", async (t) => {
  const root = await createRepository({
    "src/block.ts": [
      "/*",
      ` * ${"TO" + "DO"}: remove the compatibility path`,
      " */",
      "",
    ].join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(report, /`src\/block\.ts:2` — TODO/);
  assert.match(report, /TODO\/FIXME markers \| 1/);
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

test("reports framework test controls in case-insensitive test directories", async (t) => {
  const swiftSkip = `throw ${"XCT" + "Skip"}("hardware only")\n`;
  const root = await createRepository({
    "apps/watch/OpenFriendWatch/Tests/WatchConnectionStateTests.swift":
      swiftSkip,
    "tests/browser.test.ts": [
      `test.${"fixme"}("blocked", () => {});`,
      `test.${"todo"}("later");`,
      `test.concurrent.${"only"}("focused", () => {});`,
      "",
    ].join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /WatchConnectionStateTests\.swift:1` — skipped test \(XCTSkip\)/,
  );
  assert.match(report, /browser\.test\.ts:1` — skipped test \(test\.fixme\)/);
  assert.match(report, /browser\.test\.ts:2` — skipped test \(test\.todo\)/);
  assert.match(
    report,
    /browser\.test\.ts:3` — focused test \(test\.concurrent\.only\)/,
  );
  assert.match(report, /Skipped\/focused tests \| 4/);
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

test("does not classify repository tooling as production source", async (t) => {
  const root = await createRepository({
    "scripts/tool.mjs": Array.from({ length: 501 }, () => "line").join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.doesNotMatch(report, /`scripts\/tool\.mjs` — 501 lines/);
  assert.match(report, /Oversized files \| 0/);
});

test("reports missing required documentation and security automation", async (t) => {
  const root = await createRepository();
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(report, /`docs\/README\.md` — missing required documentation/);
  assert.match(
    report,
    /`\.github\/workflows\/ci\.yml` — missing required security automation/,
  );
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

test("reports invalid quality statuses and passing rows without proven evidence", async (t) => {
  const root = await createRepository({
    "docs/QUALITY_SCORE.md": [
      "| Dimension | Target | Status | Evidence |",
      "| --- | --- | --- | --- |",
      "| Blank | Proven | Passing | |",
      "| Contradiction | Proven | Passing | Awaits live dispatch |",
      "| Invalid | Proven | Unknown | Recorded locally |",
      "| Open | Proven | Pending | Waiting for source evidence |",
      "| Deferred | Proven | Passing | Pending provider result |",
      "| Unchecked | Proven | Passing | Unverified locally |",
      "| Unsupported | Proven | Passing | Not proven on hardware |",
      "",
    ].join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:3` — Passing status for Blank has blank evidence/,
  );
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:4` — Passing evidence for Contradiction contains an unproven signal: awaits/,
  );
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:5` — invalid quality status for Invalid: Unknown/,
  );
  assert.match(report, /`docs\/QUALITY_SCORE\.md:6` — Pending status for Open/);
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:7` — Passing evidence for Deferred contains an unproven signal: pending/,
  );
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:8` — Passing evidence for Unchecked contains an unproven signal: unverified/,
  );
  assert.match(
    report,
    /`docs\/QUALITY_SCORE\.md:9` — Passing evidence for Unsupported contains an unproven signal: not proven/,
  );
  assert.match(report, /Quality evidence \| 7/);
});

test("reports stale and missing core-document review entries from the baseline only", async (t) => {
  const root = await createRepository({
    "docs/plans/history.md":
      "# Historical plan\n\nEvidence recorded on 2025-01-01.\n",
    "scripts/maintenance-baseline.json": JSON.stringify({
      generatedOn: "2026-01-01",
      coreDocs: {
        "docs/ARCHITECTURE.md": "2026-01-01",
      },
      lineCounts: {},
    }),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root, { date: "2026-07-26" });

  assert.match(
    report,
    /`docs\/ARCHITECTURE\.md` — core-document review dated 2026-01-01 is 206 days old/,
  );
  assert.match(
    report,
    /`docs\/SECURITY\.md` — missing core-document review date/,
  );
  assert.doesNotMatch(report, /docs\/plans\/history\.md.*stale/);
});

test("reports rapid growth only when line and percentage thresholds are both met", async (t) => {
  const lines = (count) =>
    Array.from({ length: count }, () => "line").join("\n");
  const root = await createRepository({
    "scripts/maintenance-baseline.json": JSON.stringify({
      generatedOn: "2026-07-26",
      coreDocs: {},
      lineCounts: {
        "src/growing.ts": 400,
        "src/lines-only.ts": 500,
        "src/percent-only.ts": 200,
      },
    }),
    "src/growing.ts": lines(501),
    "src/lines-only.ts": lines(600),
    "src/percent-only.ts": lines(250),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /`src\/growing\.ts` — 501 lines, up 101 \(25\.3%\) from baseline 400/,
  );
  assert.doesNotMatch(report, /lines-only\.ts.*up/);
  assert.doesNotMatch(report, /percent-only\.ts.*up/);
  assert.match(report, /Rapid growth \| 1/);
});

test("reports substantial tracked source or test files missing from the baseline", async (t) => {
  const root = await createRepository({
    "scripts/maintenance-baseline.json": JSON.stringify({
      generatedOn: "2026-07-26",
      coreDocs: {},
      lineCounts: {},
    }),
    "src/substantial.ts": Array.from({ length: 200 }, () => "line").join("\n"),
    "src/small.ts": Array.from({ length: 199 }, () => "line").join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(
    report,
    /`src\/substantial\.ts` — missing baseline line count for 200-line substantial file/,
  );
  assert.doesNotMatch(report, /src\/small\.ts.*baseline/);
});

test("reports malformed baseline metadata and line counts", async (t) => {
  const root = await createRepository({
    "scripts/maintenance-baseline.json": JSON.stringify({
      coreDocs: {},
      lineCounts: {
        "tests/a.test.ts": "400",
        "tests/b.test.ts": 0,
      },
    }),
    "tests/a.test.ts": Array.from({ length: 501 }, () => "line").join("\n"),
    "tests/b.test.ts": Array.from({ length: 200 }, () => "line").join("\n"),
  });
  t.after(() => rm(root, { recursive: true, force: true }));

  const report = await generateMaintenanceReport(root);

  assert.match(report, /baseline generatedOn must be a valid YYYY-MM-DD date/);
  assert.match(
    report,
    /invalid baseline line count for tests\/a\.test\.ts: 400/,
  );
  assert.match(report, /invalid baseline line count for tests\/b\.test\.ts: 0/);
  assert.match(report, /Rapid growth \| 2/);
});

test("reports missing or unsupported dependency-health foundations", async (t) => {
  const missingRoot = await createRepository();
  const unsupportedRoot = await createRepository({
    "package.json": JSON.stringify({ packageManager: "pnpm@9.15.0" }),
    "pnpm-lock.yaml": "lockfileVersion: '9.0'\n",
  });
  t.after(() => rm(missingRoot, { recursive: true, force: true }));
  t.after(() => rm(unsupportedRoot, { recursive: true, force: true }));

  const missingReport = await generateMaintenanceReport(missingRoot);
  assert.match(missingReport, /`package\.json` — missing dependency manifest/);
  assert.match(missingReport, /`pnpm-lock\.yaml` — missing pnpm lockfile/);
  assert.match(
    missingReport,
    /`\.github\/dependabot\.yml` — missing dependency automation/,
  );
  const unsupportedReport = await generateMaintenanceReport(unsupportedRoot);
  assert.match(
    unsupportedReport,
    /`package\.json` — packageManager must declare a supported pnpm 10\.x release/,
  );
  assert.match(unsupportedReport, /Dependency health \| \d+/);
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
