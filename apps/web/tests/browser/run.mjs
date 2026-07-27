import { spawn } from "node:child_process";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer } from "vite";

const browserRoot = fileURLToPath(new URL("./", import.meta.url));
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const resultsRoot = path.join(repositoryRoot, "test-results", "browser");
const serverLog = [];

await rm(resultsRoot, { recursive: true, force: true });
await mkdir(resultsRoot, { recursive: true });

function listenOnEphemeralLoopback(vite) {
  return new Promise((resolve, reject) => {
    const httpServer = vite.httpServer;

    if (!httpServer) {
      reject(new Error("Vite did not create an HTTP server"));
      return;
    }

    const onError = (error) => {
      httpServer.off("listening", onListening);
      reject(error);
    };
    const onListening = () => {
      httpServer.off("error", onError);
      resolve();
    };

    httpServer.once("error", onError);
    httpServer.once("listening", onListening);
    httpServer.listen(0, "127.0.0.1");
  });
}

const vite = await createViteServer({
  root: browserRoot,
  appType: "mpa",
  clearScreen: false,
  logLevel: "info",
  customLogger: {
    hasErrorLogged: () => serverLog.some((line) => line.startsWith("error:")),
    info(message) {
      serverLog.push(`info: ${message}`);
    },
    warn(message) {
      serverLog.push(`warn: ${message}`);
    },
    warnOnce(message) {
      serverLog.push(`warn: ${message}`);
    },
    error(message) {
      serverLog.push(`error: ${message}`);
    },
    clearScreen() {},
    hasWarned: false,
  },
  server: {
    host: "127.0.0.1",
  },
});

function runPlaywright(baseURL) {
  const executable = path.join(appRoot, "node_modules", ".bin", "playwright");
  const childEnvironment = { ...process.env };
  delete childEnvironment.NO_COLOR;

  return new Promise((resolve, reject) => {
    const child = spawn(
      executable,
      ["test", "--config", path.join(appRoot, "playwright.config.ts")],
      {
        cwd: appRoot,
        env: {
          ...childEnvironment,
          OPENFRIEND_BROWSER_BASE_URL: baseURL,
        },
        stdio: "inherit",
      },
    );

    child.once("error", reject);
    child.once("exit", (code, signal) => {
      if (signal) {
        reject(new Error(`Playwright terminated by ${signal}`));
        return;
      }

      resolve(code ?? 1);
    });
  });
}

let exitCode = 1;

try {
  await listenOnEphemeralLoopback(vite);
  const address = vite.httpServer?.address();

  if (!address || typeof address === "string") {
    throw new Error("Vite did not expose a loopback TCP address");
  }

  const baseURL = `http://127.0.0.1:${address.port}`;
  serverLog.push(`listening: ${baseURL}`);
  exitCode = await runPlaywright(baseURL);
} finally {
  await vite.close();
  serverLog.push("closed");
  await writeFile(
    path.join(resultsRoot, "server.log"),
    `${serverLog.join("\n")}\n`,
  );
}

process.exitCode = exitCode;
