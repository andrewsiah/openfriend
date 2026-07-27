import { getLiveModelProfile } from "@openfriend/contracts";

import { OPENFRIEND_REALTIME_INSTRUCTIONS } from "../../../../lib/live-agent-config";
import { mintRealtimeClientSecret } from "../../../../lib/realtime-client-secret.server";

// Phase 1 only: replace this opaque identifier with a per-user hash before multi-user access.
const PHASE_ONE_SAFETY_IDENTIFIER =
  "of_phase1_9c398ab46d98bc9bb926f412e0b6ceba330195a771ff181a6e04db";

function jsonResponse(body: unknown, status = 200): Response {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

function badGateway(): Response {
  return jsonResponse({ error: "Unable to start a live conversation." }, 502);
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
      return jsonResponse({ error: "Invalid request." }, 400);
    }

    profileId = (body as { profile: string }).profile;
  } catch {
    return jsonResponse({ error: "Invalid request." }, 400);
  }

  let profile;

  try {
    profile = getLiveModelProfile(profileId);
  } catch {
    return jsonResponse({ error: "Invalid live profile." }, 400);
  }

  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    return jsonResponse({ error: "Realtime service is unavailable." }, 503);
  }

  try {
    const clientSecret = await mintRealtimeClientSecret({
      apiKey,
      model: profile.model,
      safetyIdentifier: PHASE_ONE_SAFETY_IDENTIFIER,
      instructions: OPENFRIEND_REALTIME_INSTRUCTIONS,
    });

    return jsonResponse(clientSecret);
  } catch {
    return badGateway();
  }
}
