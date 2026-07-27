const OPENAI_CLIENT_SECRETS_URL =
  "https://api.openai.com/v1/realtime/client_secrets";
const mintFailure = Object.freeze({
  category: "realtime_client_secret_failed",
  message: "Unable to start a live conversation.",
});

type MintRealtimeClientSecretInput = Readonly<{
  apiKey: string;
  model: string;
  safetyIdentifier: string;
  instructions: string;
}>;

type MintedRealtimeClientSecret = Readonly<{
  clientSecret: string;
  expiresAt: number;
  model: string;
}>;

type Fetcher = (
  input: string | URL | Request,
  init?: RequestInit,
) => Promise<Response>;

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

export async function mintRealtimeClientSecret(
  input: MintRealtimeClientSecretInput,
  fetcher: Fetcher = fetch,
): Promise<MintedRealtimeClientSecret> {
  try {
    const response = await fetcher(OPENAI_CLIENT_SECRETS_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${input.apiKey}`,
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": input.safetyIdentifier,
      },
      body: JSON.stringify({
        expires_after: {
          anchor: "created_at",
          seconds: 600,
        },
        session: {
          type: "realtime",
          model: input.model,
          instructions: input.instructions,
        },
      }),
    });

    if (!response.ok) {
      throw mintFailure;
    }

    const clientSecret: unknown = await response.json();

    if (
      !isOpenAIClientSecret(clientSecret) ||
      clientSecret.session.model !== input.model
    ) {
      throw mintFailure;
    }

    return {
      clientSecret: clientSecret.value,
      expiresAt: clientSecret.expires_at,
      model: clientSecret.session.model,
    };
  } catch {
    throw mintFailure;
  }
}
