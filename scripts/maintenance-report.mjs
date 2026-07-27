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
export const SUBSTANTIAL_BASELINE_LINES = 200;

const REQUIRED_SECURITY_AUTOMATION = [".github/workflows/ci.yml"];
const MAINTENANCE_BASELINE = "scripts/maintenance-baseline.json";

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
    `(?:\\/\\/|#|\\/\\*+|<!--|^\\s*\\*)\\s*(${"TO" + "DO"}|${"FIX" + "ME"})\\b`,
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
    /(?:^|\/)(?:__tests__|tests?)(?:\/|$)/i.test(relativePath) ||
    /\.(?:spec|test)\.[^.]+$/i.test(relativePath)
  );
}

function findTestControlMarkers(relativePath, source) {
  if (!isTestFile(relativePath)) {
    return [];
  }

  const findings = [];
  const controlPattern =
    /\b((?:test|it|describe|suite)(?:\.(?:concurrent|describe))?\.(?:skip|only|fixme|todo))\s*\(|\b(fdescribe|fit|xdescribe|xit|xtest)\s*\(|\b(XCTSkip(?:If|Unless)?)\s*\(/g;

  source.split(/\r?\n/).forEach((line, index) => {
    for (const match of line.matchAll(controlPattern)) {
      const marker = match[1] ?? match[2] ?? match[3];
      const kind =
        marker.endsWith(".only") || /^(?:fdescribe|fit)$/.test(marker)
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
  const productionFile = /^(?:apps|packages|src)\//.test(relativePath);
  if (!testFile && !productionFile) {
    return [];
  }

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
      const dimension = cells[0] || "unnamed dimension";
      const status = cells[2] ?? "";
      const normalizedStatus = status.toLowerCase();

      if (
        normalizedStatus &&
        normalizedStatus !== "status" &&
        !/^:?-+:?$/.test(normalizedStatus) &&
        normalizedStatus !== "passing" &&
        normalizedStatus !== "pending"
      ) {
        findings.push({
          issue: `invalid quality status for ${dimension}: ${status}`,
          location: `${relativePath}:${index + 1}`,
        });
      } else if (normalizedStatus === "pending") {
        findings.push({
          issue: `Pending status for ${dimension}`,
          location: `${relativePath}:${index + 1}`,
        });
      } else if (normalizedStatus === "passing") {
        const evidence = cells[3] ?? "";
        const unprovenSignal = evidence
          .toLowerCase()
          .match(/\b(pending|awaits|unverified|not proven)\b/)?.[1];

        if (!evidence) {
          findings.push({
            issue: `Passing status for ${dimension} has blank evidence`,
            location: `${relativePath}:${index + 1}`,
          });
        } else if (unprovenSignal) {
          findings.push({
            issue: `Passing evidence for ${dimension} contains an unproven signal: ${unprovenSignal}`,
            location: `${relativePath}:${index + 1}`,
          });
        }
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

async function loadMaintenanceBaseline(root, repositoryFileSet) {
  if (!repositoryFileSet.has(MAINTENANCE_BASELINE)) {
    return {
      baseline: undefined,
      findings: [
        {
          issue: "missing maintenance baseline",
          path: MAINTENANCE_BASELINE,
        },
      ],
    };
  }

  try {
    const baseline = JSON.parse(
      await readFile(path.join(root, MAINTENANCE_BASELINE), "utf8"),
    );
    const findings = [];

    try {
      if (typeof baseline.generatedOn !== "string") {
        throw new Error("missing generatedOn");
      }
      parseExplicitDate(baseline.generatedOn);
    } catch {
      findings.push({
        issue: "baseline generatedOn must be a valid YYYY-MM-DD date",
        path: MAINTENANCE_BASELINE,
      });
    }

    if (
      !baseline.coreDocs ||
      typeof baseline.coreDocs !== "object" ||
      Array.isArray(baseline.coreDocs)
    ) {
      baseline.coreDocs = {};
      findings.push({
        issue: "baseline coreDocs must be a path-to-date mapping",
        path: MAINTENANCE_BASELINE,
      });
    }

    if (
      !baseline.lineCounts ||
      typeof baseline.lineCounts !== "object" ||
      Array.isArray(baseline.lineCounts)
    ) {
      baseline.lineCounts = {};
      findings.push({
        issue: "baseline lineCounts must be a path-to-count mapping",
        path: MAINTENANCE_BASELINE,
      });
    }

    return { baseline, findings };
  } catch {
    return {
      baseline: undefined,
      findings: [
        {
          issue: "maintenance baseline must contain valid JSON",
          path: MAINTENANCE_BASELINE,
        },
      ],
    };
  }
}

function findDocumentationReviews(baseline, reportDate) {
  if (!baseline) {
    return [];
  }

  const findings = [];

  for (const relativePath of REQUIRED_DOCS) {
    const reviewDate = baseline.coreDocs[relativePath];

    if (!reviewDate) {
      findings.push({
        issue: "missing core-document review date",
        path: relativePath,
      });
      continue;
    }

    let parsedReviewDate;
    try {
      parsedReviewDate = parseExplicitDate(reviewDate);
    } catch {
      findings.push({
        issue: `invalid core-document review date: ${reviewDate}`,
        path: relativePath,
      });
      continue;
    }

    if (!reportDate) {
      continue;
    }

    const ageDays = Math.floor(
      (reportDate.valueOf() - parsedReviewDate.valueOf()) / 86_400_000,
    );
    if (ageDays > QUALITY_EVIDENCE_WARNING_DAYS) {
      findings.push({
        issue: `core-document review dated ${reviewDate} is ${ageDays} days old`,
        path: relativePath,
      });
    }
  }

  return findings;
}

function findRapidGrowth(baseline, currentLineCounts) {
  if (!baseline) {
    return [];
  }

  const findings = [];
  const currentEntries = [...currentLineCounts.entries()].sort(
    ([left], [right]) => left.localeCompare(right),
  );

  for (const [relativePath, currentCount] of currentEntries) {
    if (
      SOURCE_EXTENSIONS.has(path.extname(relativePath)) &&
      currentCount >= SUBSTANTIAL_BASELINE_LINES &&
      !Object.hasOwn(baseline.lineCounts, relativePath)
    ) {
      findings.push({
        issue: `missing baseline line count for ${currentCount}-line substantial file`,
        path: relativePath,
      });
    }
  }

  const baselineEntries = Object.entries(baseline.lineCounts).sort(
    ([left], [right]) => left.localeCompare(right),
  );

  for (const [relativePath, baselineCount] of baselineEntries) {
    if (!Number.isInteger(baselineCount) || baselineCount < 1) {
      findings.push({
        issue: `invalid baseline line count for ${relativePath}: ${String(baselineCount)}`,
        path: MAINTENANCE_BASELINE,
      });
      continue;
    }

    const currentCount = currentLineCounts.get(relativePath);
    if (currentCount === undefined) {
      continue;
    }

    const addedLines = currentCount - baselineCount;
    const growthPercent = (addedLines / baselineCount) * 100;
    if (addedLines >= 100 && growthPercent >= 25) {
      findings.push({
        addedLines,
        baselineCount,
        currentCount,
        growthPercent,
        path: relativePath,
      });
    }
  }

  return findings;
}

async function findDependencyHealth(root, repositoryFileSet) {
  const findings = [];

  if (!repositoryFileSet.has("package.json")) {
    findings.push({
      issue: "missing dependency manifest",
      path: "package.json",
    });
  } else {
    try {
      const packageJson = JSON.parse(
        await readFile(path.join(root, "package.json"), "utf8"),
      );
      if (!/^pnpm@10\.\d+\.\d+$/.test(packageJson.packageManager ?? "")) {
        findings.push({
          issue: "packageManager must declare a supported pnpm 10.x release",
          path: "package.json",
        });
      }
    } catch {
      findings.push({
        issue: "dependency manifest must contain valid JSON",
        path: "package.json",
      });
    }
  }

  const requiredFiles = [
    ["pnpm-lock.yaml", "missing pnpm lockfile"],
    [".github/dependabot.yml", "missing dependency automation"],
    [
      ".github/workflows/dependency-review.yml",
      "missing pull-request dependency review",
    ],
  ];

  for (const [relativePath, issue] of requiredFiles) {
    if (!repositoryFileSet.has(relativePath)) {
      findings.push({ issue, path: relativePath });
    }
  }

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
  const currentLineCounts = new Map();
  const dependencyHealth = [];
  const documentationReviews = [];
  const qualityEvidence = [];
  const rapidGrowth = [];
  const repositoryGuardrails = [];
  const oversizedFiles = [];
  const taskMarkers = [];
  const testControlMarkers = [];
  const repositoryFiles = await listRepositoryFiles(root);
  const repositoryFileSet = new Set(repositoryFiles);
  const { baseline, findings: baselineFindings } =
    await loadMaintenanceBaseline(root, repositoryFileSet);

  documentationReviews.push(...baselineFindings);
  documentationReviews.push(...findDocumentationReviews(baseline, reportDate));
  dependencyHealth.push(
    ...(await findDependencyHealth(root, repositoryFileSet)),
  );

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
    currentLineCounts.set(relativePath, countLines(source));
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

  rapidGrowth.push(...findRapidGrowth(baseline, currentLineCounts));

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
    `| Documentation reviews | ${documentationReviews.length} |`,
    `| Rapid growth | ${rapidGrowth.length} |`,
    `| Dependency health | ${dependencyHealth.length} |`,
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
      "Documentation reviews",
      documentationReviews,
      "Review missing or stale core documents and update the checked-in baseline date from that completed review.",
      (finding) => `\`${finding.path}\` — ${finding.issue}`,
    ),
    ...renderSection(
      "Rapid growth",
      rapidGrowth,
      "Review files that grew by at least 100 lines and 25%; refresh the baseline only after accepting the new structure.",
      (finding) =>
        finding.issue
          ? `\`${finding.path}\` — ${finding.issue}`
          : `\`${finding.path}\` — ${finding.currentCount} lines, up ${finding.addedLines} (${finding.growthPercent.toFixed(1)}%) from baseline ${finding.baselineCount}`,
    ),
    ...renderSection(
      "Dependency health",
      dependencyHealth,
      "Restore the pnpm manifest and lockfile or required dependency automation; provider alerts remain authoritative for vulnerabilities.",
      (finding) => `\`${finding.path}\` — ${finding.issue}`,
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
