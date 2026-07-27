import { spawn } from "node:child_process";
import { mkdir, writeFile } from "node:fs/promises";
import { createServer as createTcpServer } from "node:net";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

import { createServer as createViteServer } from "vite";

const browserRoot = fileURLToPath(new URL("./", import.meta.url));
const appRoot = fileURLToPath(new URL("../../", import.meta.url));
const repositoryRoot = fileURLToPath(new URL("../../../../", import.meta.url));
const resultsRoot = path.join(repositoryRoot, "test-results", "browser");
const serverLog = [];

await mkdir(resultsRoot, { recursive: true });

function chooseLoopbackPort() {
  return new Promise((resolve, reject) => {
    const reservation = createTcpServer();
    reservation.once("error", reject);
    reservation.listen(0, "127.0.0.1", () => {
      const address = reservation.address();

      if (!address || typeof address === "string") {
        reservation.close();
        reject(new Error("Could not reserve a loopback TCP port"));
        return;
      }

      reservation.close((error) => {
        if (error) {
          reject(error);
          return;
        }

        resolve(address.port);
      });
    });
  });
}

const port = await chooseLoopbackPort();
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
    port,
    strictPort: true,
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
  await vite.listen();
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
