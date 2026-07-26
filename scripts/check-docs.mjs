import { access, readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const AGENTS_LINE_BUDGET = 80;

export const REQUIRED_DOCS = [
  "docs/README.md",
  "docs/PRODUCT.md",
  "docs/ARCHITECTURE.md",
  "docs/INFRASTRUCTURE.md",
  "docs/ENGINEERING.md",
  "docs/TESTING.md",
  "docs/SECURITY.md",
  "docs/RELIABILITY.md",
  "docs/USER_STORIES.md",
  "docs/PLANS.md",
  "docs/QUALITY_SCORE.md",
  "docs/decisions/README.md",
];

const ROOT_MARKDOWN_FILES = [
  "AGENTS.md",
  "CLAUDE.md",
  "CODE_OF_CONDUCT.md",
  "CONTRIBUTING.md",
  "README.md",
  "SECURITY.md",
];

async function exists(target) {
  try {
    await access(target);
    return true;
  } catch {
    return false;
  }
}

async function listMarkdownFiles(root) {
  const files = [];

  for (const relativePath of ROOT_MARKDOWN_FILES) {
    if (await exists(path.join(root, relativePath))) {
      files.push(relativePath);
    }
  }

  async function visit(directory) {
    for (const entry of await readdir(path.join(root, directory), {
      withFileTypes: true,
    })) {
      const relativePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        await visit(relativePath);
      } else if (entry.isFile() && entry.name.endsWith(".md")) {
        files.push(relativePath);
      }
    }
  }

  if (await exists(path.join(root, "docs"))) {
    await visit("docs");
  }

  return files;
}

function relativeLinkTargets(markdown) {
  const targets = [];
  const linkPattern = /!?\[[^\]]*]\(([^)]+)\)/g;

  for (const match of markdown.matchAll(linkPattern)) {
    const rawTarget = match[1].trim().replace(/^<|>$/g, "");
    const target = rawTarget.split(/\s+["']/)[0];

    if (
      !target ||
      target.startsWith("#") ||
      target.startsWith("/") ||
      /^[a-z][a-z\d+.-]*:/i.test(target)
    ) {
      continue;
    }

    targets.push(target.split("#")[0].split("?")[0]);
  }

  return targets.filter(Boolean);
}

export async function validateDocumentation(root) {
  const errors = [];

  for (const relativePath of REQUIRED_DOCS) {
    const absolutePath = path.join(root, relativePath);

    if (
      !(await exists(absolutePath)) ||
      (await readFile(absolutePath, "utf8")).trim().length === 0
    ) {
      errors.push(`required document is missing or empty: ${relativePath}`);
    }
  }

  for (const relativePath of await listMarkdownFiles(root)) {
    const markdown = await readFile(path.join(root, relativePath), "utf8");

    for (const target of relativeLinkTargets(markdown)) {
      const decodedTarget = decodeURIComponent(target);
      const resolvedTarget = path.resolve(
        root,
        path.dirname(relativePath),
        decodedTarget,
      );

      if (!(await exists(resolvedTarget))) {
        errors.push(
          `broken relative link in ${relativePath}: ${decodedTarget}`,
        );
      }
    }
  }

  const agentsPath = path.join(root, "AGENTS.md");
  if (await exists(agentsPath)) {
    const agents = await readFile(agentsPath, "utf8");
    const lineCount = agents === "" ? 0 : agents.split(/\r?\n/).length;

    if (lineCount > AGENTS_LINE_BUDGET) {
      errors.push(
        `AGENTS.md has ${lineCount} lines; budget is ${AGENTS_LINE_BUDGET}`,
      );
    }
  }

  return errors;
}

async function main() {
  const errors = await validateDocumentation(process.cwd());

  if (errors.length > 0) {
    console.error("Documentation check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Documentation check passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
