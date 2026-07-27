import { createHmac } from "node:crypto";

import { getLiveModelProfile } from "@openfriend/contracts";

import { OPENFRIEND_REALTIME_INSTRUCTIONS } from "../../../../../lib/live-agent-config";
import { mintRealtimeClientSecret } from "../../../../../lib/realtime-client-secret.server";
import { verifyWatchIdentity } from "../../../../../lib/watch-identity.server";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function authenticationFailure(): Response {
  return jsonResponse({ error: "Watch authentication failed." }, 401);
}

function serviceUnavailable(): Response {
  return jsonResponse({ error: "Realtime service is unavailable." }, 503);
}

function badGateway(): Response {
  return jsonResponse({ error: "Unable to start a live conversation." }, 502);
}

function parseBearerToken(header: string | null): string | undefined {
  return /^Bearer ([^\s]+)$/.exec(header ?? "")?.[1];
}

function deriveSafetyIdentifier(subject: string, key: string): string {
  const digest = createHmac("sha256", key).update(subject).digest("hex");

  return `of_watch_${digest}`.slice(0, 64);
}

export async function POST(request: Request): Promise<Response> {
  const audience = process.env.OPENFRIEND_WATCH_APPLE_AUDIENCE?.trim();
  const allowedSubject =
    process.env.OPENFRIEND_WATCH_ALLOWED_APPLE_SUBJECT?.trim();
  const safetyHmacKey = process.env.OPENFRIEND_WATCH_SAFETY_HMAC_KEY?.trim();
  const apiKey = process.env.OPENAI_API_KEY?.trim();

  if (!audience || !allowedSubject || !safetyHmacKey || !apiKey) {
    return serviceUnavailable();
  }

  const identityToken = parseBearerToken(request.headers.get("Authorization"));
  const rawNonce = request.headers.get("X-OpenFriend-Nonce");

  if (!identityToken || !rawNonce?.trim()) {
    return authenticationFailure();
  }

  let subject: string;

  try {
    ({ subject } = await verifyWatchIdentity(identityToken, rawNonce, {
      audience,
      allowedSubject,
    }));
  } catch {
    return authenticationFailure();
  }

  const profile = getLiveModelProfile("economy");

  try {
    const clientSecret = await mintRealtimeClientSecret({
      apiKey,
      model: profile.model,
      safetyIdentifier: deriveSafetyIdentifier(subject, safetyHmacKey),
      instructions: OPENFRIEND_REALTIME_INSTRUCTIONS,
    });

    if (clientSecret.model !== profile.model) {
      return badGateway();
    }

    return jsonResponse(clientSecret);
  } catch {
    return badGateway();
  }
}
