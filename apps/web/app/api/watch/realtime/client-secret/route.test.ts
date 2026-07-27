import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const dependencies = vi.hoisted(() => ({
  verifyWatchIdentity: vi.fn(),
  mintRealtimeClientSecret: vi.fn(),
}));

vi.mock("../../../../../lib/watch-identity.server", () => ({
  verifyWatchIdentity: dependencies.verifyWatchIdentity,
}));
vi.mock("../../../../../lib/realtime-client-secret.server", () => ({
  mintRealtimeClientSecret: dependencies.mintRealtimeClientSecret,
}));

import { POST } from "./route";

const bearerToken = "synthetic_identity_credential";
const rawNonce = "synthetic_raw_nonce";
const subject = "synthetic-private-subject";
const apiKey = "synthetic-api-credential";
const hmacKey = "synthetic-hmac-key-material";

function stubValidEnvironment() {
  vi.stubEnv("OPENFRIEND_WATCH_APPLE_AUDIENCE", "synthetic.watch.app");
  vi.stubEnv(
    "OPENFRIEND_WATCH_ALLOWED_APPLE_SUBJECT",
    "synthetic-allowed-subject",
  );
  vi.stubEnv("OPENFRIEND_WATCH_SAFETY_HMAC_KEY", hmacKey);
  vi.stubEnv("OPENAI_API_KEY", apiKey);
}

function request(
  authorization: string | null = `Bearer ${bearerToken}`,
  nonce: string | null = rawNonce,
) {
  const headers = new Headers({ "Content-Type": "application/json" });

  if (authorization !== null) {
    headers.set("Authorization", authorization);
  }

  if (nonce !== null) {
    headers.set("X-OpenFriend-Nonce", nonce);
  }

  return new Request("http://localhost/api/watch/realtime/client-secret", {
    method: "POST",
    headers,
    body: "{}",
  });
}

beforeEach(() => {
  stubValidEnvironment();
  dependencies.verifyWatchIdentity.mockResolvedValue({ subject });
  dependencies.mintRealtimeClientSecret.mockResolvedValue({
    clientSecret: "synthetic-ephemeral-credential",
    expiresAt: 1_800_000_000,
    model: "gpt-realtime-2.1-mini",
  });
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("POST /api/watch/realtime/client-secret", () => {
  it.each([
    ["missing authorization", null, rawNonce],
    ["empty authorization", "", rawNonce],
    ["wrong authorization scheme", "Basic synthetic", rawNonce],
    ["missing bearer value", "Bearer", rawNonce],
    ["multiple bearer values", "Bearer synthetic extra", rawNonce],
    ["missing nonce", `Bearer ${bearerToken}`, null],
  ])(
    "returns the same no-store authentication failure for %s",
    async (_label, authorization, nonce) => {
      const response = await POST(request(authorization, nonce));

      expect(response.status).toBe(401);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error: "Watch authentication failed.",
      });
      expect(dependencies.verifyWatchIdentity).not.toHaveBeenCalled();
      expect(dependencies.mintRealtimeClientSecret).not.toHaveBeenCalled();
    },
  );

  it("returns the same authentication failure when identity verification fails", async () => {
    dependencies.verifyWatchIdentity.mockRejectedValue({
      category: "authentication_failed",
    });

    const response = await POST(request());

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({
      error: "Watch authentication failed.",
    });
    expect(dependencies.mintRealtimeClientSecret).not.toHaveBeenCalled();
  });

  it("mints only the Economy profile with a stable private safety identifier", async () => {
    const response = await POST(request());
    const expectedSafetyIdentifier = `of_watch_${createHmac("sha256", hmacKey)
      .update(subject)
      .digest("hex")}`.slice(0, 64);

    expect(dependencies.verifyWatchIdentity).toHaveBeenCalledWith(
      bearerToken,
      rawNonce,
      {
        audience: "synthetic.watch.app",
        allowedSubject: "synthetic-allowed-subject",
      },
    );
    expect(dependencies.mintRealtimeClientSecret).toHaveBeenCalledWith({
      apiKey,
      model: "gpt-realtime-2.1-mini",
      safetyIdentifier: expectedSafetyIdentifier,
      instructions: expect.any(String),
    });
    expect(expectedSafetyIdentifier).toMatch(/^of_watch_[a-f0-9]{55}$/);
    expect(expectedSafetyIdentifier).not.toContain(subject);
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      clientSecret: "synthetic-ephemeral-credential",
      expiresAt: 1_800_000_000,
      model: "gpt-realtime-2.1-mini",
    });
  });

  it.each([
    "OPENFRIEND_WATCH_APPLE_AUDIENCE",
    "OPENFRIEND_WATCH_ALLOWED_APPLE_SUBJECT",
    "OPENFRIEND_WATCH_SAFETY_HMAC_KEY",
    "OPENAI_API_KEY",
  ])("fails closed when %s is missing", async (variableName) => {
    vi.stubEnv(variableName, "");

    const response = await POST(request());

    expect(response.status).toBe(503);
    expect(response.headers.get("Cache-Control")).toBe("no-store");
    expect(await response.json()).toEqual({
      error: "Realtime service is unavailable.",
    });
    expect(dependencies.verifyWatchIdentity).not.toHaveBeenCalled();
    expect(dependencies.mintRealtimeClientSecret).not.toHaveBeenCalled();
  });

  it.each([
    [
      "OpenAI failure",
      () => Promise.reject({ category: "realtime_client_secret_failed" }),
    ],
    [
      "malformed upstream response",
      () => Promise.reject({ category: "realtime_client_secret_failed" }),
    ],
    [
      "returned model mismatch",
      () =>
        Promise.resolve({
          clientSecret: "synthetic-ephemeral-credential",
          expiresAt: 1_800_000_000,
          model: "gpt-realtime-2.1",
        }),
    ],
  ])(
    "returns a sanitized no-store bad gateway for %s",
    async (_label, result) => {
      dependencies.mintRealtimeClientSecret.mockImplementation(result);

      const response = await POST(request());

      expect(response.status).toBe(502);
      expect(response.headers.get("Cache-Control")).toBe("no-store");
      expect(await response.json()).toEqual({
        error: "Unable to start a live conversation.",
      });
    },
  );

  it("never returns or logs credentials, identity, or upstream detail", async () => {
    const loggerSpies = [
      vi.spyOn(console, "error").mockImplementation(() => undefined),
      vi.spyOn(console, "info").mockImplementation(() => undefined),
      vi.spyOn(console, "log").mockImplementation(() => undefined),
      vi.spyOn(console, "warn").mockImplementation(() => undefined),
    ];
    dependencies.mintRealtimeClientSecret.mockRejectedValue(
      new Error("synthetic private upstream detail"),
    );

    const response = await POST(request());
    const publicResponse = JSON.stringify(await response.json());
    const forbiddenValues = [
      bearerToken,
      subject,
      apiKey,
      "synthetic private upstream detail",
      `of_watch_${createHmac("sha256", hmacKey)
        .update(subject)
        .digest("hex")}`.slice(0, 64),
    ];

    for (const forbiddenValue of forbiddenValues) {
      expect(publicResponse).not.toContain(forbiddenValue);
    }
    for (const loggerSpy of loggerSpies) {
      expect(loggerSpy).not.toHaveBeenCalled();
    }
  });
});
