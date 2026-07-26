import { getLiveModelProfile } from "@openfriend/contracts";

import { OPENFRIEND_REALTIME_INSTRUCTIONS } from "../../../../lib/live-agent-config";

const OPENAI_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";
// Phase 1 only: replace this opaque identifier with a per-user hash before multi-user access.
const PHASE_ONE_SAFETY_IDENTIFIER =
  "of_phase1_9c398ab46d98bc9bb926f412e0b6ceba330195a771ff181a6e04db";

interface OpenAIClientSecret {
  value: string;
  expires_at: number;
  session: {
    model: string;
  };
}

function isOpenAIClientSecret(value: unknown): value is OpenAIClientSecret {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;
  const session = candidate.session;

  return (
    typeof candidate.value === "string" &&
    candidate.value.length > 0 &&
    typeof candidate.expires_at === "number" &&
    Number.isFinite(candidate.expires_at) &&
    typeof session === "object" &&
    session !== null &&
    typeof (session as Record<string, unknown>).model === "string"
  );
}

function badGateway(): Response {
  return Response.json(
    { error: "Unable to start a live conversation." },
    { status: 502 },
  );
}

export async function POST(request: Request): Promise<Response> {
  let profileId: string;

  try {
    const body: unknown = await request.json();

    if (
      typeof body !== "object" ||
      body === null ||
      typeof (body as Record<string, unknown>).profile !== "string"
    ) {
      return Response.json({ error: "Invalid request." }, { status: 400 });
    }

    profileId = (body as { profile: string }).profile;
  } catch {
    return Response.json({ error: "Invalid request." }, { status: 400 });
  }

  let profile;

  try {
    profile = getLiveModelProfile(profileId);
  } catch {
    return Response.json({ error: "Invalid live profile." }, { status: 400 });
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return Response.json(
      { error: "Realtime service is unavailable." },
      { status: 503 },
    );
  }

  let upstreamResponse: Response;

  try {
    upstreamResponse = await fetch(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": PHASE_ONE_SAFETY_IDENTIFIER,
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: 600,
        },
        session: {
          type: "realtime",
          model: profile.model,
          instructions: OPENFRIEND_REALTIME_INSTRUCTIONS,
        },
      }),
    });
  } catch {
    return badGateway();
  }

  if (!upstreamResponse.ok) {
    return badGateway();
  }

  let clientSecret: unknown;

  try {
    clientSecret = await upstreamResponse.json();
  } catch {
    return badGateway();
  }

  if (
    !isOpenAIClientSecret(clientSecret) ||
    clientSecret.session.model !== profile.model
  ) {
    return badGateway();
  }

  return Response.json({
    clientSecret: clientSecret.value,
    expiresAt: clientSecret.expires_at,
    model: clientSecret.session.model,
  });
}
