import { createHash, timingSafeEqual } from "node:crypto";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

const APPLE_ISSUER = "https://appleid.apple.com";
const APPLE_JWKS = new URL("https://appleid.apple.com/auth/keys");
const appleKeySet = createRemoteJWKSet(APPLE_JWKS);
const authenticationFailure = Object.freeze({
  category: "authentication_failed",
  message: "Watch authentication failed.",
});

type VerifiedWatchIdentity = Readonly<{
  subject: string;
}>;

type WatchIdentityEnvironment = Readonly<{
  audience: string;
  allowedSubject: string;
}>;

type WatchIdentityClaims = JWTPayload &
  Readonly<{
    nonce?: unknown;
  }>;

type VerifyJWT = (
  identityToken: string,
  expectation: Readonly<{
    issuer: string;
    audience: string;
  }>,
) => Promise<Readonly<{ payload: WatchIdentityClaims }>>;

async function verifyAppleJWT(
  identityToken: string,
  expectation: Readonly<{ issuer: string; audience: string }>,
) {
  return jwtVerify(identityToken, appleKeySet, expectation);
}

function equalsConstantTime(actual: string, expected: string) {
  const actualBytes = Buffer.from(actual);
  const expectedBytes = Buffer.from(expected);

  return (
    actualBytes.length === expectedBytes.length &&
    timingSafeEqual(actualBytes, expectedBytes)
  );
}

export async function verifyWatchIdentity(
  identityToken: string,
  rawNonce: string,
  environment: WatchIdentityEnvironment,
  verifyJWT: VerifyJWT = verifyAppleJWT,
): Promise<VerifiedWatchIdentity> {
  try {
    if (
      !identityToken ||
      !rawNonce ||
      !environment.audience.trim() ||
      !environment.allowedSubject.trim()
    ) {
      throw authenticationFailure;
    }

    const { payload } = await verifyJWT(identityToken, {
      issuer: APPLE_ISSUER,
      audience: environment.audience,
    });
    const expectedNonce = createHash("sha256")
      .update(rawNonce)
      .digest("base64url");

    if (
      payload.iss !== APPLE_ISSUER ||
      payload.aud !== environment.audience ||
      typeof payload.exp !== "number" ||
      payload.exp <= Math.floor(Date.now() / 1_000) ||
      typeof payload.nonce !== "string" ||
      !equalsConstantTime(payload.nonce, expectedNonce) ||
      typeof payload.sub !== "string" ||
      !equalsConstantTime(payload.sub, environment.allowedSubject)
    ) {
      throw authenticationFailure;
    }

    return { subject: environment.allowedSubject };
  } catch {
    throw authenticationFailure;
  }
}
