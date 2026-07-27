import { describe, expect, it, vi } from "vitest";

import { mintRealtimeClientSecret } from "./realtime-client-secret.server";

const input = {
  apiKey: "synthetic-api-credential",
  model: "gpt-realtime-2.1-mini",
  safetyIdentifier: "of_watch_4ca1c4d7ad679128311a70d1d4f7281e9d4b203bad315033",
  instructions: "Use a synthetic conversational instruction.",
};

function validUpstreamResponse(
  overrides: Record<string, unknown> = {},
): Record<string, unknown> {
  return {
    value: "synthetic-ephemeral-credential",
    expires_at: 1_800_000_000,
    session: {
      model: input.model,
    },
    ...overrides,
  };
}

describe("mintRealtimeClientSecret", () => {
  it("mints a 600-second model-bound secret with the safety identifier", async () => {
    const fetcher = vi
      .fn()
      .mockResolvedValue(Response.json(validUpstreamResponse()));

    await expect(mintRealtimeClientSecret(input, fetcher)).resolves.toEqual({
      clientSecret: "synthetic-ephemeral-credential",
      expiresAt: 1_800_000_000,
      model: "gpt-realtime-2.1-mini",
    });

    expect(fetcher).toHaveBeenCalledOnce();
    const [url, init] = fetcher.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer synthetic-api-credential",
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": input.safetyIdentifier,
      },
    });
    expect(JSON.parse(String(init.body))).toEqual({
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        type: "realtime",
        model: "gpt-realtime-2.1-mini",
        instructions: input.instructions,
      },
    });
  });

  it.each([
    [
      "upstream failure",
      vi
        .fn()
        .mockResolvedValue(
          new Response("synthetic private upstream body", { status: 503 }),
        ),
    ],
    [
      "non-JSON response",
      vi
        .fn()
        .mockResolvedValue(new Response("synthetic non-JSON", { status: 200 })),
    ],
    [
      "network failure",
      vi.fn().mockRejectedValue(new Error("synthetic network failure")),
    ],
    [
      "malformed response",
      vi.fn().mockResolvedValue(
        Response.json(
          validUpstreamResponse({
            expires_at: "synthetic-invalid-expiry",
          }),
        ),
      ),
    ],
    [
      "model mismatch",
      vi.fn().mockResolvedValue(
        Response.json(
          validUpstreamResponse({
            session: {
              model: "gpt-realtime-2.1",
            },
          }),
        ),
      ),
    ],
  ])("uses one sanitized category for %s", async (_label, fetcher) => {
    const failure = await mintRealtimeClientSecret(input, fetcher).catch(
      (error: unknown) => error,
    );

    expect(failure).toEqual({
      category: "realtime_client_secret_failed",
      message: "Unable to start a live conversation.",
    });
    expect(JSON.stringify(failure)).not.toContain(input.apiKey);
    expect(JSON.stringify(failure)).not.toContain(input.safetyIdentifier);
  });
});
