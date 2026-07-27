import { afterEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

describe("POST /api/realtime/client-secret", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
  });

  it("marks every response category as no-store", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-server-credential");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          value: "synthetic-client-secret",
          expires_at: 1_800_000_000,
          session: {
            model: "gpt-realtime-2.1-mini",
          },
        }),
      ),
    );
    const success = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );
    const invalidRequest = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      }),
    );

    vi.stubEnv("OPENAI_API_KEY", "");
    const missingConfiguration = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    vi.stubEnv("OPENAI_API_KEY", "synthetic-server-credential");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("synthetic upstream failure", { status: 503 }),
        ),
    );
    const upstreamFailure = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    for (const response of [
      success,
      invalidRequest,
      missingConfiguration,
      upstreamFailure,
    ]) {
      expect(response.headers.get("Cache-Control")).toBe("no-store");
    }
  });

  it("mints an Economy client secret with the server credential", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        value: "test-client-secret",
        expires_at: 1_800_000_000,
        session: {
          model: "gpt-realtime-2.1-mini",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      clientSecret: "test-client-secret",
      expiresAt: 1_800_000_000,
      model: "gpt-realtime-2.1-mini",
    });
    expect(fetchMock).toHaveBeenCalledOnce();

    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.openai.com/v1/realtime/client_secrets");
    expect(init).toMatchObject({
      method: "POST",
      headers: {
        Authorization: "Bearer test-server-key",
        "Content-Type": "application/json",
        "OpenAI-Safety-Identifier": expect.stringMatching(
          /^of_phase1_[a-f0-9]{54}$/,
        ),
      },
    });
    expect(
      String(
        (init.headers as Record<string, string>)["OpenAI-Safety-Identifier"],
      ).length,
    ).toBeLessThanOrEqual(64);
    expect(JSON.parse(String(init.body))).toEqual({
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        type: "realtime",
        model: "gpt-realtime-2.1-mini",
        instructions: expect.any(String),
      },
    });
  });

  it("mints a Quality client secret with the exact profile model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "synthetic-server-credential");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        value: "synthetic-client-secret",
        expires_at: 1_800_000_000,
        session: {
          model: "gpt-realtime-2.1",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "quality" }),
      }),
    );

    expect(await response.json()).toEqual({
      clientSecret: "synthetic-client-secret",
      expiresAt: 1_800_000_000,
      model: "gpt-realtime-2.1",
    });
    expect(
      JSON.parse(
        String((fetchMock.mock.calls[0] as [string, RequestInit])[1].body),
      ),
    ).toMatchObject({
      expires_after: {
        anchor: "created_at",
        seconds: 600,
      },
      session: {
        model: "gpt-realtime-2.1",
      },
    });
  });

  it("returns a sanitized service-unavailable response without a server key", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");
    const fetchMock = vi.fn().mockResolvedValue(
      Response.json({
        value: "test-client-secret",
        expires_at: 1_800_000_000,
        session: {
          model: "gpt-realtime-2.1-mini",
        },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(503);
    expect(await response.json()).toEqual({
      error: "Realtime service is unavailable.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a sanitized bad request for an unknown live profile", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "unknown-private-profile" }),
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid live profile.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("returns a sanitized bad gateway for an OpenAI failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValue(
          new Response("private upstream failure body", { status: 401 }),
        ),
    );

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to start a live conversation.",
    });
  });

  it("returns a sanitized bad gateway for a malformed OpenAI response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          value: "private-upstream-value",
          expires_at: "not-a-timestamp",
          session: {},
          private_detail: "must not be exposed",
        }),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to start a live conversation.",
    });
  });

  it("returns a sanitized bad gateway when OpenAI returns a different model", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        Response.json({
          value: "test-client-secret",
          expires_at: 1_800_000_000,
          session: {
            model: "gpt-realtime-2.1",
          },
        }),
      ),
    );

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to start a live conversation.",
    });
  });

  it("returns a sanitized bad request for invalid JSON", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{",
      }),
    );

    expect(response.status).toBe(400);
    expect(await response.json()).toEqual({
      error: "Invalid request.",
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([{}, { profile: 42 }])(
    "returns a sanitized bad request for a missing or non-string profile",
    async (body) => {
      vi.stubEnv("OPENAI_API_KEY", "test-server-key");
      const fetchMock = vi.fn();
      vi.stubGlobal("fetch", fetchMock);

      const response = await POST(
        new Request("http://localhost/api/realtime/client-secret", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        }),
      );

      expect(response.status).toBe(400);
      expect(await response.json()).toEqual({
        error: "Invalid request.",
      });
      expect(fetchMock).not.toHaveBeenCalled();
    },
  );

  it("returns a sanitized bad gateway for a network failure", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network unavailable")),
    );

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to start a live conversation.",
    });
  });

  it("returns a sanitized bad gateway for a non-JSON OpenAI response", async () => {
    vi.stubEnv("OPENAI_API_KEY", "test-server-key");
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("not JSON", { status: 200 })),
    );

    const response = await POST(
      new Request("http://localhost/api/realtime/client-secret", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ profile: "economy" }),
      }),
    );

    expect(response.status).toBe(502);
    expect(await response.json()).toEqual({
      error: "Unable to start a live conversation.",
    });
  });
});
