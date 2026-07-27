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

function resolvedPathIsInDirectory(root, resolvedPath, directory) {
  if (!resolvedPath) {
    return false;
  }

  const relative = relativePath(root, resolvedPath);
  return relative === directory || relative.startsWith(`${directory}/`);
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
  for (const statement of sourceFile.statements) {
    if (
      !ts.isExpressionStatement(statement) ||
      !ts.isStringLiteral(statement.expression)
    ) {
      return false;
    }

    if (statement.expression.text === "use client") {
      return true;
    }
  }

  return false;
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
    /(?:^|\/)server(?:\/|$)/.test(target) ||
    /(?:^|\/)[^/]+\.server(?:\.[^/]+)?$/.test(target)
  );
}

function referencedServerSecrets(sourceFile) {
  const secrets = new Set();

  function visit(node) {
    if (ts.isIdentifier(node) && SERVER_SECRET_NAMES.includes(node.text)) {
      secrets.add(node.text);
    }

    if (
      ts.isElementAccessExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      ts.isIdentifier(node.expression.expression) &&
      node.expression.expression.text === "process" &&
      node.expression.name.text === "env" &&
      node.argumentExpression &&
      ts.isStringLiteral(node.argumentExpression) &&
      SERVER_SECRET_NAMES.includes(node.argumentExpression.text)
    ) {
      secrets.add(node.argumentExpression.text);
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);
  return secrets;
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

function createModuleResolver(root) {
  const configByPath = new Map();
  const configPathByDirectory = new Map();

  function compilerConfig(importer) {
    const directory = path.dirname(importer);
    let configPath = configPathByDirectory.get(directory);

    if (configPath === undefined) {
      configPath =
        ts.findConfigFile(directory, ts.sys.fileExists, "tsconfig.json") ??
        null;
      configPathByDirectory.set(directory, configPath);
    }

    if (configByPath.has(configPath)) {
      return configByPath.get(configPath);
    }

    let options = {};
    if (configPath) {
      const readResult = ts.readConfigFile(configPath, ts.sys.readFile);
      if (!readResult.error) {
        options = ts.parseJsonConfigFileContent(
          readResult.config,
          ts.sys,
          path.dirname(configPath),
          undefined,
          configPath,
        ).options;
      }
    }

    const config = {
      options,
      cache: ts.createModuleResolutionCache(
        root,
        (fileName) => fileName,
        options,
      ),
    };
    configByPath.set(configPath, config);
    return config;
  }

  return (specifier, importer) => {
    const config = compilerConfig(importer);
    return ts.resolveModuleName(
      specifier,
      importer,
      config.options,
      ts.sys,
      config.cache,
    ).resolvedModule?.resolvedFileName;
  };
}

function diagnostic(file, rule, message, remediation) {
  return `${file} [${rule}] ${message} Remediation: ${remediation}`;
}

export async function checkArchitecture(root) {
  const errors = [];
  const appPackageNames = await appWorkspacePackageNames(root);
  const resolveModule = createModuleResolver(root);

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
        const resolvedImport = resolveModule(specifier, absolutePath);
        if (file.startsWith("packages/contracts/")) {
          const reason =
            contractsForbiddenReason(
              root,
              absolutePath,
              specifier,
              appPackageNames,
            ) ??
            (resolvedPathIsInDirectory(root, resolvedImport, "apps")
              ? "application implementation import"
              : undefined);
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
          resolvedPathIsInDirectory(root, resolvedImport, "apps") ||
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

      for (const secretName of referencedServerSecrets(sourceFile)) {
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
  if (
    rootIndex !== -1 &&
    (!arguments_[rootIndex + 1] || arguments_[rootIndex + 1].startsWith("--"))
  ) {
    throw new Error(
      "Usage: node scripts/check-architecture.mjs [--root <path>]",
    );
  }

  return rootIndex === -1
    ? process.cwd()
    : path.resolve(arguments_[rootIndex + 1]);
}

async function main() {
  let root;
  try {
    root = parseRootArgument(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    process.exitCode = 2;
    return;
  }

  const errors = await checkArchitecture(root);

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
