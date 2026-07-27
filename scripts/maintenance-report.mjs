import { readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { REQUIRED_DOCS } from "./check-docs.mjs";

const EXCLUDED_DIRECTORIES = new Set([
  ".git",
  ".next",
  ".turbo",
  ".worktrees",
  "coverage",
  "dist",
  "node_modules",
  "test-results",
]);

const TEXT_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".scss",
  ".sh",
  ".swift",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".swift",
  ".ts",
  ".tsx",
]);

export const PRODUCTION_LINE_WARNING = 500;
export const TEST_LINE_WARNING = 1000;
export const QUALITY_EVIDENCE_WARNING_DAYS = 90;

const REQUIRED_SECURITY_AUTOMATION = [
  ".github/dependabot.yml",
  ".github/workflows/ci.yml",
  ".github/workflows/dependency-review.yml",
];

async function listRepositoryFiles(root) {
  const files = [];

  async function visit(relativeDirectory) {
    const absoluteDirectory = path.join(root, relativeDirectory);
    const entries = await readdir(absoluteDirectory, { withFileTypes: true });

    for (const entry of entries) {
      const relativePath = path.join(relativeDirectory, entry.name);

      if (entry.isDirectory()) {
        if (!EXCLUDED_DIRECTORIES.has(entry.name)) {
          await visit(relativePath);
        }
      } else if (entry.isFile()) {
        files.push(relativePath);
      }
    }
  }

  await visit("");
  return files.sort((left, right) => left.localeCompare(right));
}

function findTaskMarkers(relativePath, source) {
  const findings = [];
  const markerPattern = new RegExp(
    `(?:\\/\\/|#|\\/\\*+|<!--)\\s*(${"TO" + "DO"}|${"FIX" + "ME"})\\b`,
    "g",
  );

  source.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(markerPattern)) {
      findings.push({
        location: `${relativePath}:${index + 1}`,
        marker: match[1],
      });
    }
  });

  return findings;
}

function isTestFile(relativePath) {
  return (
    /(?:^|\/)(?:__tests__|tests?)(?:\/|$)/.test(relativePath) ||
    /\.(?:spec|test)\.[^.]+$/.test(relativePath)
  );
}

function findTestControlMarkers(relativePath, source) {
  if (!isTestFile(relativePath)) {
    return [];
  }

  const findings = [];
  const controlPattern =
    /\b(test|it|describe|suite)\.(skip|only)\s*\(|\b(fdescribe|fit|xdescribe|xit|xtest)\s*\(|\b(XCTSkip(?:If|Unless)?)\s*\(/g;

  source.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(controlPattern)) {
      const marker = match[1]
        ? `${match[1]}.${match[2]}`
        : (match[3] ?? match[4]);
      const kind =
        match[2] === "only" || /^(?:fdescribe|fit)$/.test(marker)
          ? "focused test"
          : "skipped test";

      findings.push({
        kind,
        location: `${relativePath}:${index + 1}`,
        marker,
      });
    }
  });

  return findings;
}

function countLines(source) {
  if (source.length === 0) {
    return 0;
  }

  const lines = source.split(/\r?\n/);
  return lines.at(-1) === "" ? lines.length - 1 : lines.length;
}

function findOversizedFile(relativePath, source) {
  if (!SOURCE_EXTENSIONS.has(path.extname(relativePath))) {
    return [];
  }

  const testFile = isTestFile(relativePath);
  const threshold = testFile ? TEST_LINE_WARNING : PRODUCTION_LINE_WARNING;
  const lineCount = countLines(source);

  if (lineCount <= threshold) {
    return [];
  }

  return [
    {
      kind: testFile ? "test" : "production",
      lineCount,
      path: relativePath,
      threshold,
    },
  ];
}

function parseExplicitDate(date) {
  if (date === undefined) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    throw new Error("--date must use YYYY-MM-DD");
  }

  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.valueOf()) ||
    parsed.toISOString().slice(0, 10) !== date
  ) {
    throw new Error("--date must be a valid calendar date");
  }

  return parsed;
}

function findQualityEvidence(relativePath, source, reportDate) {
  if (relativePath !== "docs/QUALITY_SCORE.md") {
    return [];
  }

  const findings = [];

  source.split(/\r?\n/).forEach((line, index) => {
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const cells = line
        .trim()
        .slice(1, -1)
        .split("|")
        .map((cell) => cell.trim());

      if (cells[2]?.toLowerCase() === "pending") {
        findings.push({
          issue: `Pending status for ${cells[0] || "unnamed dimension"}`,
          location: `${relativePath}:${index + 1}`,
        });
      }
    }

    if (!reportDate) {
      return;
    }

    for (const match of line.matchAll(/\b\d{4}-\d{2}-\d{2}\b/g)) {
      let evidenceDate;
      try {
        evidenceDate = parseExplicitDate(match[0]);
      } catch {
        continue;
      }

      const ageDays = Math.floor(
        (reportDate.valueOf() - evidenceDate.valueOf()) / 86_400_000,
      );
      if (ageDays > QUALITY_EVIDENCE_WARNING_DAYS) {
        findings.push({
          issue: `evidence dated ${match[0]} is ${ageDays} days old`,
          location: `${relativePath}:${index + 1}`,
        });
      }
    }
  });

  return findings;
}

async function findBrokenRelativeLinks(root, relativePath, source) {
  if (path.extname(relativePath) !== ".md") {
    return [];
  }

  const findings = [];
  const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

  for (const [index, line] of source.split(/\r?\n/).entries()) {
    for (const match of line.matchAll(linkPattern)) {
      const rawTarget = match[1].trim().replace(/^<|>$/g, "");
      const targetWithOptionalTitle = rawTarget.split(/\s+["']/)[0];

      if (
        !targetWithOptionalTitle ||
        targetWithOptionalTitle.startsWith("#") ||
        targetWithOptionalTitle.startsWith("/") ||
        /^[a-z][a-z\d+.-]*:/i.test(targetWithOptionalTitle)
      ) {
        continue;
      }

      const target = targetWithOptionalTitle.split("#")[0].split("?")[0];
      if (!target) {
        continue;
      }

      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(target);
      } catch {
        decodedTarget = target;
      }

      const absoluteTarget = path.resolve(
        root,
        path.dirname(relativePath),
        decodedTarget,
      );
      const relativeTarget = path.relative(root, absoluteTarget);
      const escapesRoot =
        relativeTarget === ".." || relativeTarget.startsWith(`..${path.sep}`);

      try {
        if (escapesRoot) {
          throw new Error("link escapes repository root");
        }
        await stat(absoluteTarget);
      } catch (error) {
        if (!escapesRoot && error.code !== "ENOENT") {
          throw error;
        }

        findings.push({
          issue: "broken relative link",
          location: `${relativePath}:${index + 1}`,
          target: decodedTarget,
        });
      }
    }
  }

  return findings;
}

function renderSection(title, findings, remediation, renderFinding) {
  const lines = [`## ${title}`, ""];

  if (findings.length === 0) {
    lines.push("No findings.", "");
  } else {
    lines.push(...findings.map((finding) => `- ${renderFinding(finding)}`), "");
  }

  lines.push(`Remediation: ${remediation}`, "");
  return lines;
}

export async function generateMaintenanceReport(root, options = {}) {
  const reportDate = parseExplicitDate(options.date);
  const qualityEvidence = [];
  const repositoryGuardrails = [];
  const oversizedFiles = [];
  const taskMarkers = [];
  const testControlMarkers = [];
  const repositoryFiles = await listRepositoryFiles(root);
  const repositoryFileSet = new Set(repositoryFiles);

  for (const requiredPath of REQUIRED_DOCS) {
    if (!repositoryFileSet.has(requiredPath)) {
      repositoryGuardrails.push({
        issue: "missing required documentation",
        path: requiredPath,
      });
    }
  }

  for (const requiredPath of REQUIRED_SECURITY_AUTOMATION) {
    if (!repositoryFileSet.has(requiredPath)) {
      repositoryGuardrails.push({
        issue: "missing required security automation",
        path: requiredPath,
      });
    }
  }

  for (const relativePath of repositoryFiles) {
    if (!TEXT_EXTENSIONS.has(path.extname(relativePath))) {
      continue;
    }

    const source = await readFile(path.join(root, relativePath), "utf8");
    repositoryGuardrails.push(
      ...(await findBrokenRelativeLinks(root, relativePath, source)),
    );
    qualityEvidence.push(
      ...findQualityEvidence(relativePath, source, reportDate),
    );
    oversizedFiles.push(...findOversizedFile(relativePath, source));
    taskMarkers.push(...findTaskMarkers(relativePath, source));
    testControlMarkers.push(...findTestControlMarkers(relativePath, source));
  }

  const lines = [
    "# Repository maintenance report",
    "",
    ...(options.date ? [`Generated for: ${options.date}`, ""] : []),
    "This report is informational. Findings do not fail the quality gate.",
    "",
    "## Summary",
    "",
    "| Category | Findings |",
    "| --- | ---: |",
    `| TODO/FIXME markers | ${taskMarkers.length} |`,
    `| Skipped/focused tests | ${testControlMarkers.length} |`,
    `| Oversized files | ${oversizedFiles.length} |`,
    `| Repository guardrails | ${repositoryGuardrails.length} |`,
    `| Quality evidence | ${qualityEvidence.length} |`,
    "",
    ...renderSection(
      "TODO and FIXME markers",
      taskMarkers,
      "Replace completed markers with code or tests; track intentional work in the accepted plan.",
      (finding) => `\`${finding.location}\` — ${finding.marker}`,
    ),
    ...renderSection(
      "Skipped and focused tests",
      testControlMarkers,
      "Restore skipped coverage and remove focused markers before relying on the full suite.",
      (finding) =>
        `\`${finding.location}\` — ${finding.kind} (${finding.marker})`,
    ),
    ...renderSection(
      "Oversized files",
      oversizedFiles,
      "Split files only where a cohesive boundary improves ownership or testability; these thresholds are warnings, not failures.",
      (finding) =>
        `\`${finding.path}\` — ${finding.lineCount} lines (${finding.kind} warning threshold: ${finding.threshold})`,
    ),
    ...renderSection(
      "Repository guardrails",
      repositoryGuardrails,
      "Restore the required document or least-privilege security automation, then verify its links and configuration.",
      (finding) =>
        finding.target
          ? `\`${finding.location}\` — ${finding.issue} to \`${finding.target}\``
          : `\`${finding.path}\` — ${finding.issue}`,
    ),
    ...renderSection(
      "Quality evidence",
      qualityEvidence,
      "Resolve Pending rows with source-system evidence and refresh dated evidence older than 90 days.",
      (finding) => `\`${finding.location}\` — ${finding.issue}`,
    ),
  ];

  return `${lines.join("\n").trimEnd()}\n`;
}

function parseArguments(args) {
  const options = { root: process.cwd() };

  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index];
    const value = args[index + 1];

    if (argument !== "--root" && argument !== "--date") {
      throw new Error(`unknown argument: ${argument}`);
    }
    if (!value || value.startsWith("--")) {
      throw new Error(`${argument} requires a value`);
    }

    if (argument === "--root") {
      options.root = path.resolve(value);
    } else {
      options.date = value;
    }
    index += 1;
  }

  return options;
}

async function main() {
  try {
    const { root, date } = parseArguments(process.argv.slice(2));
    const report = await generateMaintenanceReport(root, { date });
    process.stdout.write(report);
  } catch (error) {
    console.error(`maintenance report failed: ${error.message}`);
    process.exitCode = 1;
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
