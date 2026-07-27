import { createHash } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { verifyWatchIdentity } from "./watch-identity.server";

const environment = {
  audience: "synthetic.watch.app",
  allowedSubject: "synthetic-allowed-subject",
};
const identityToken = "synthetic_identity_token";
const rawNonce = "synthetic_raw_nonce";
const nowSeconds = 2_000_000_000;

type SyntheticClaims = Readonly<{
  iss?: string;
  aud?: string;
  exp?: number;
  nonce?: string;
  sub?: string;
}>;

function validClaims(
  overrides: Partial<SyntheticClaims> = {},
): SyntheticClaims {
  return {
    iss: "https://appleid.apple.com",
    aud: environment.audience,
    exp: nowSeconds + 300,
    nonce: createHash("sha256").update(rawNonce).digest("base64url"),
    sub: environment.allowedSubject,
    ...overrides,
  };
}

afterEach(() => {
  vi.useRealTimers();
});

describe("verifyWatchIdentity", () => {
  it("returns only the allowed subject for a nonce-bound Apple identity", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(nowSeconds * 1_000);
    const verifyJWT = vi.fn().mockResolvedValue({ payload: validClaims() });

    await expect(
      verifyWatchIdentity(identityToken, rawNonce, environment, verifyJWT),
    ).resolves.toEqual({ subject: environment.allowedSubject });

    expect(verifyJWT).toHaveBeenCalledWith(identityToken, {
      issuer: "https://appleid.apple.com",
      audience: environment.audience,
    });
  });

  it.each([
    ["empty audience", { audience: "", allowedSubject: "synthetic-subject" }],
    [
      "empty allowed subject",
      { audience: "synthetic.watch.app", allowedSubject: "" },
    ],
  ])(
    "fails closed for %s configuration",
    async (_label, invalidEnvironment) => {
      const verifyJWT = vi.fn();

      await expect(
        verifyWatchIdentity(
          identityToken,
          rawNonce,
          invalidEnvironment,
          verifyJWT,
        ),
      ).rejects.toMatchObject({ category: "authentication_failed" });
      expect(verifyJWT).not.toHaveBeenCalled();
    },
  );

  it.each([
    ["malformed", undefined, new Error("synthetic verification failure")],
    [
      "wrong issuer",
      validClaims({ iss: "https://synthetic.invalid" }),
      undefined,
    ],
    ["wrong audience", validClaims({ aud: "synthetic.other.app" }), undefined],
    ["expired", validClaims({ exp: nowSeconds - 1 }), undefined],
    ["wrong nonce", validClaims({ nonce: "synthetic-wrong-nonce" }), undefined],
    [
      "wrong subject",
      validClaims({ sub: "synthetic-other-subject" }),
      undefined,
    ],
  ])(
    "uses the same public category for a %s token",
    async (_label, claims, verificationError) => {
      vi.useFakeTimers();
      vi.setSystemTime(nowSeconds * 1_000);
      const verifyJWT = verificationError
        ? vi.fn().mockRejectedValue(verificationError)
        : vi.fn().mockResolvedValue({ payload: claims });

      await expect(
        verifyWatchIdentity(identityToken, rawNonce, environment, verifyJWT),
      ).rejects.toMatchObject({ category: "authentication_failed" });
    },
  );

  it("does not expose the token or subject in authentication failures", async () => {
    const verifyJWT = vi.fn().mockResolvedValue({
      payload: validClaims({ sub: "synthetic-private-subject" }),
    });

    const failure = await verifyWatchIdentity(
      identityToken,
      rawNonce,
      environment,
      verifyJWT,
    ).catch((error: unknown) => error);
    const publicFailure = JSON.stringify(failure);

    expect(publicFailure).toBe(
      '{"category":"authentication_failed","message":"Watch authentication failed."}',
    );
    expect(publicFailure).not.toContain(identityToken);
    expect(publicFailure).not.toContain("synthetic-private-subject");
  });
});
