import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

import { expect, test } from "@playwright/test";

type BrowserEvidence = {
  browser: string[];
  console: string[];
  errors: string[];
  network: string[];
};

const evidence = new WeakMap<object, BrowserEvidence>();

test.beforeEach(async ({ page }) => {
  const testEvidence: BrowserEvidence = {
    browser: [],
    console: [],
    errors: [],
    network: [],
  };
  evidence.set(page, testEvidence);

  page.on("console", (message) => {
    const entry = `${message.type()}: ${message.text()}`;
    testEvidence.console.push(entry);
    if (message.type() === "error") {
      testEvidence.errors.push(`console ${entry}`);
    }
  });
  page.on("pageerror", (error) => {
    testEvidence.errors.push(`page: ${error.message}`);
  });
  page.on("request", (request) => {
    testEvidence.network.push(`${request.method()} ${request.url()}`);
  });
  page.on("requestfailed", (request) => {
    testEvidence.errors.push(
      `request: ${request.method()} ${request.url()} ${request.failure()?.errorText ?? "failed"}`,
    );
  });
  page.on("response", (response) => {
    testEvidence.network.push(`${response.status()} ${response.url()}`);
    if (response.status() >= 400) {
      testEvidence.errors.push(
        `response: ${response.status()} ${response.url()}`,
      );
    }
  });

  await page.route("**/*", async (route) => {
    const requestUrl = new URL(route.request().url());
    const harnessUrl = new URL(
      process.env.OPENFRIEND_BROWSER_BASE_URL ?? "http://127.0.0.1",
    );

    if (requestUrl.origin === harnessUrl.origin) {
      await route.continue();
      return;
    }

    testEvidence.browser.push(`blocked external request ${requestUrl.origin}`);
    await route.abort("blockedbyclient");
  });

  await page.route("**/api/realtime/client-secret", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        clientSecret: "ek_synthetic_browser_test",
        model: "gpt-realtime-2.1",
      }),
    });
  });
});

test.afterEach(async ({ page }, testInfo) => {
  const testEvidence = evidence.get(page);

  try {
    await page.evaluate(() => {
      window.__openfriendBrowserHarness?.unmount();
    });
  } finally {
    if (testEvidence) {
      const logDirectory = testInfo.outputPath("logs");
      await mkdir(logDirectory, { recursive: true });
      await Promise.all([
        writeFile(
          path.join(logDirectory, "browser.log"),
          `${testEvidence.browser.join("\n")}\n`,
        ),
        writeFile(
          path.join(logDirectory, "console.log"),
          `${testEvidence.console.join("\n")}\n`,
        ),
        writeFile(
          path.join(logDirectory, "network.log"),
          `${testEvidence.network.join("\n")}\n`,
        ),
      ]);

      expect(testEvidence.errors, "browser/runtime errors").toEqual([]);
    }
  }
});

test("Quality conversation becomes live, measures response, interrupts, ends, and resets", async ({
  page,
}) => {
  await page.goto("/harness.html");

  await page.getByRole("radio", { name: /quality/i }).check();
  await page.getByRole("button", { name: /start live conversation/i }).click();

  const sessionStatus = page.locator("[data-status]");
  await expect(sessionStatus).toHaveAttribute("data-status", "live");
  await expect(
    page.getByRole("log", { name: /conversation transcript/i }),
  ).toContainText("Can you stay with me while I plan my morning?");
  await expect(
    page.getByRole("log", { name: /conversation transcript/i }),
  ).toContainText("Of course. What would make this morning feel manageable?");
  await expect(page.getByText("Connection").locator("..")).toContainText(
    "12 ms",
  );
  await expect(
    page.getByText("Voice response start").locator(".."),
  ).toContainText("34 ms");

  await page.getByRole("button", { name: /interrupt openfriend/i }).click();
  await expect(
    page.getByRole("log", { name: /conversation transcript/i }),
  ).toContainText("Interrupted at your request.");
  await expect(page.getByTestId("harness-events")).toContainText("interrupt:1");

  await page.getByRole("button", { name: /end live conversation/i }).click();
  await expect(sessionStatus).toHaveAttribute("data-status", "ended");
  await expect(page.getByTestId("harness-events")).toContainText("close:1");

  await page.getByRole("button", { name: /reset voice lab/i }).click();
  await expect(sessionStatus).toHaveAttribute("data-status", "idle");
  await expect(
    page.getByRole("log", { name: /conversation transcript/i }),
  ).toContainText("Your conversation will appear here for this session only.");
  await expect(page.getByTestId("harness-events")).toContainText("close:1");
});

test("deterministic connection failure reaches an honest failed state and closes", async ({
  page,
}) => {
  await page.goto("/harness.html?scenario=failure");
  await page.getByRole("button", { name: /start live conversation/i }).click();

  const sessionStatus = page.locator("[data-status]");
  await expect(sessionStatus).toHaveAttribute("data-status", "failed");
  await expect(sessionStatus).toContainText(
    "The live conversation could not continue.",
  );
  await expect(page.getByTestId("harness-events")).toContainText(
    "connect-failed:1",
  );
  await expect(page.getByTestId("harness-events")).toContainText("close:1");
});

declare global {
  interface Window {
    __openfriendBrowserHarness?: {
      unmount(): void;
    };
  }
}
