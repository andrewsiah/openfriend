import { spawnSync } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { createServer } from "vite";

import { SYNTHETIC_PAIRED_SPEECH } from "./spoken-guide.mjs";

const harnessDirectory = dirname(fileURLToPath(import.meta.url));
const fixtureDirectory = await mkdtemp(
  join(tmpdir(), "openfriend-synthetic-voice-"),
);

function run(command, arguments_) {
  const result = spawnSync(command, arguments_, {
    encoding: "utf8",
    stdio: "pipe",
  });

  if (result.status !== 0) {
    const detail = result.stderr.trim() || result.stdout.trim();
    throw new Error(`${command} failed${detail ? `: ${detail}` : "."}`);
  }
}

function generateFixture(name, phrase, rate) {
  const source = join(fixtureDirectory, `${name}.aiff`);
  const output = join(fixtureDirectory, `${name}.wav`);

  run("say", ["-r", String(rate), "-o", source, phrase]);
  run("afconvert", ["-f", "WAVE", "-d", "LEI16@16000", source, output]);
}

if (process.platform !== "darwin") {
  throw new Error(
    "The temporary synthetic voice harness currently requires macOS `say`.",
  );
}

generateFixture("reset", SYNTHETIC_PAIRED_SPEECH[0], 205);
generateFixture("decision", SYNTHETIC_PAIRED_SPEECH[1], 205);
generateFixture("redirect", SYNTHETIC_PAIRED_SPEECH[2], 215);

const server = await createServer({
  clearScreen: false,
  publicDir: fixtureDirectory,
  root: harnessDirectory,
  server: {
    host: "127.0.0.1",
    port: 4173,
    proxy: {
      "/api": {
        changeOrigin: true,
        target: "http://127.0.0.1:3010",
      },
    },
    strictPort: true,
  },
});

await server.listen();
server.printUrls();

let closing = false;

async function close() {
  if (closing) {
    return;
  }

  closing = true;
  await server.close();
  await rm(fixtureDirectory, { force: true, recursive: true });
}

process.on("SIGINT", () => {
  void close().finally(() => process.exit(0));
});
process.on("SIGTERM", () => {
  void close().finally(() => process.exit(0));
});
