import { readFile, readdir } from "node:fs/promises";
import { builtinModules } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ts from "typescript";

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".js",
  ".jsx",
  ".mjs",
  ".mts",
  ".cts",
  ".ts",
  ".tsx",
]);

const CONFIG_EXTENSIONS = new Set([".json", ".toml", ".yaml", ".yml"]);

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

const NODE_BUILTINS = new Set(
  builtinModules.flatMap((moduleName) => [moduleName, `node:${moduleName}`]),
);

const SERVER_SECRET_NAMES = [
  "OPENAI_API_KEY",
  "SUPABASE_DB_PASS",
  "SUPABASE_DB_URL",
  "SUPABASE_POOLER_URL",
  "VERCEL_TOKEN",
];

const DEPRECATED_LIVE_MODEL = ["gpt", "realtime", "mini"].join("-");

function relativePath(root, absolutePath) {
  return path.relative(root, absolutePath).split(path.sep).join("/");
}

function importSpecifiers(sourceFile) {
  const specifiers = [];

  function visit(node) {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      ts.isStringLiteral(node.moduleSpecifier)
    ) {
      specifiers.push(node.moduleSpecifier.text);
    } else if (
      ts.isCallExpression(node) &&
      node.arguments.length === 1 &&
      ts.isStringLiteral(node.arguments[0]) &&
      (node.expression.kind === ts.SyntaxKind.ImportKeyword ||
        (ts.isIdentifier(node.expression) &&
          node.expression.text === "require"))
    ) {
      specifiers.push(node.arguments[0].text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return specifiers;
}

function resolvesIntoDirectory(root, importer, specifier, directory) {
  if (specifier.startsWith(".")) {
    const resolved = path.resolve(path.dirname(importer), specifier);
    const relative = relativePath(root, resolved);
    return relative === directory || relative.startsWith(`${directory}/`);
  }

  return specifier === directory || specifier.startsWith(`${directory}/`);
}

function referencesAppPackage(specifier, appPackageNames) {
  return [...appPackageNames].some(
    (packageName) =>
      specifier === packageName || specifier.startsWith(`${packageName}/`),
  );
}

function contractsForbiddenReason(root, importer, specifier, appPackageNames) {
  if (specifier === "react" || specifier.startsWith("react/")) {
    return "React framework import";
  }

  if (specifier === "next" || specifier.startsWith("next/")) {
    return "Next.js framework import";
  }

  if (NODE_BUILTINS.has(specifier)) {
    return "Node.js runtime import";
  }

  if (
    resolvesIntoDirectory(root, importer, specifier, "apps") ||
    referencesAppPackage(specifier, appPackageNames) ||
    (specifier.startsWith("@openfriend/") &&
      specifier !== "@openfriend/contracts")
  ) {
    return "application implementation import";
  }

  return undefined;
}

function hasUseClientDirective(sourceFile) {
  const firstStatement = sourceFile.statements[0];
  return (
    firstStatement !== undefined &&
    ts.isExpressionStatement(firstStatement) &&
    ts.isStringLiteral(firstStatement.expression) &&
    firstStatement.expression.text === "use client"
  );
}

function isBrowserModule(file, sourceFile) {
  return (
    hasUseClientDirective(sourceFile) ||
    /^apps\/[^/]+\/components\//.test(file) ||
    /\.client\.[cm]?[jt]sx?$/.test(file)
  );
}

function isExplicitServerImport(root, importer, specifier) {
  if (specifier === "server-only") {
    return true;
  }

  const target = specifier.startsWith(".")
    ? relativePath(root, path.resolve(path.dirname(importer), specifier))
    : specifier;

  return (
    /(?:^|\/)app\/api(?:\/|$)/.test(target) ||
    /(?:^|[./-])server(?:[./-]|$)/.test(target)
  );
}

function isTestArtifact(file) {
  return (
    /(^|\/)(?:__tests__|fixtures|tests)(?:\/|$)/.test(file) ||
    /\.(?:spec|test)\.[^.]+$/.test(file) ||
    file.endsWith(".snap")
  );
}

async function listArchitectureFiles(root) {
  const files = [];

  async function visit(directory) {
    let entries;
    try {
      entries = await readdir(directory, { withFileTypes: true });
    } catch (error) {
      if (error.code === "ENOENT") {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      if (entry.isDirectory() && EXCLUDED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      const absolutePath = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        await visit(absolutePath);
      } else if (
        entry.isFile() &&
        (SOURCE_EXTENSIONS.has(path.extname(entry.name)) ||
          CONFIG_EXTENSIONS.has(path.extname(entry.name)))
      ) {
        files.push(absolutePath);
      }
    }
  }

  await visit(root);
  return files;
}

async function appWorkspacePackageNames(root) {
  const names = new Set();
  let entries;

  try {
    entries = await readdir(path.join(root, "apps"), { withFileTypes: true });
  } catch (error) {
    if (error.code === "ENOENT") {
      return names;
    }
    throw error;
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) {
      continue;
    }

    try {
      const manifest = JSON.parse(
        await readFile(
          path.join(root, "apps", entry.name, "package.json"),
          "utf8",
        ),
      );
      if (typeof manifest.name === "string" && manifest.name.length > 0) {
        names.add(manifest.name);
      }
    } catch (error) {
      if (error.code !== "ENOENT") {
        throw error;
      }
    }
  }

  return names;
}

function diagnostic(file, rule, message, remediation) {
  return `${file} [${rule}] ${message} Remediation: ${remediation}`;
}

export async function checkArchitecture(root) {
  const errors = [];
  const appPackageNames = await appWorkspacePackageNames(root);

  for (const absolutePath of await listArchitectureFiles(root)) {
    const file = relativePath(root, absolutePath);
    const source = await readFile(absolutePath, "utf8");

    if (isTestArtifact(file)) {
      continue;
    }

    if (
      source.includes(DEPRECATED_LIVE_MODEL) &&
      file !== "scripts/check-architecture.mjs"
    ) {
      errors.push(
        diagnostic(
          file,
          "deprecated-live-model",
          `production code or configuration references deprecated model "${DEPRECATED_LIVE_MODEL}".`,
          'use the supported economy model "gpt-realtime-2.1-mini" or quality model "gpt-realtime-2.1".',
        ),
      );
    }

    if (!SOURCE_EXTENSIONS.has(path.extname(absolutePath))) {
      continue;
    }

    const sourceFile = ts.createSourceFile(
      file,
      source,
      ts.ScriptTarget.Latest,
      false,
    );

    if (file.startsWith("packages/")) {
      for (const specifier of importSpecifiers(sourceFile)) {
        if (file.startsWith("packages/contracts/")) {
          const reason = contractsForbiddenReason(
            root,
            absolutePath,
            specifier,
            appPackageNames,
          );
          if (reason) {
            errors.push(
              diagnostic(
                file,
                "contracts-runtime-independent",
                `${reason} "${specifier}" couples shared contracts to an application framework or runtime.`,
                "keep this module to framework-independent TypeScript types and values; move runtime behavior to the consuming app or another package.",
              ),
            );
          }
          continue;
        }

        if (
          resolvesIntoDirectory(root, absolutePath, specifier, "apps") ||
          referencesAppPackage(specifier, appPackageNames)
        ) {
          errors.push(
            diagnostic(
              file,
              "packages-no-app-imports",
              `package code imports application implementation "${specifier}".`,
              "move the shared contract or behavior into a package, then import that package instead.",
            ),
          );
        }
      }
    }

    if (isBrowserModule(file, sourceFile)) {
      for (const specifier of importSpecifiers(sourceFile)) {
        if (!isExplicitServerImport(root, absolutePath, specifier)) {
          continue;
        }

        errors.push(
          diagnostic(
            file,
            "client-server-boundary",
            `browser code imports explicit server-only module or route "${specifier}".`,
            "call the server boundary through an HTTP/API client or move browser-safe values into a separate client module.",
          ),
        );
      }

      for (const secretName of SERVER_SECRET_NAMES) {
        if (!new RegExp(`\\b${secretName}\\b`).test(source)) {
          continue;
        }

        errors.push(
          diagnostic(
            file,
            "client-server-boundary",
            `browser code references named server secret "${secretName}".`,
            "read this secret only in a server route or server-only module and return the minimum non-secret response the browser needs.",
          ),
        );
      }
    }
  }

  return errors;
}

function parseRootArgument(arguments_) {
  const rootIndex = arguments_.indexOf("--root");
  return rootIndex === -1
    ? process.cwd()
    : path.resolve(arguments_[rootIndex + 1] ?? "");
}

async function main() {
  const errors = await checkArchitecture(
    parseRootArgument(process.argv.slice(2)),
  );

  if (errors.length > 0) {
    console.error("Architecture check failed:");
    for (const error of errors) {
      console.error(`- ${error}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Architecture check passed.");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
