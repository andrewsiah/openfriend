import { describe, expect, it } from "vitest";

import { evaluateSyntheticVoiceRun } from "./result";

describe("evaluateSyntheticVoiceRun", () => {
  it("passes only when the real transport, transcript, response, interruption, and cleanup are observed", () => {
    const result = evaluateSyntheticVoiceRun({
      assistantTranscript: "The clear daytime sky is usually blue.",
      audioStarted: true,
      closed: true,
      connected: true,
      connectionLatencyMs: 482,
      forcedCommit: true,
      interruptRequested: true,
      interrupted: true,
      responseLatencyMs: 731,
      userTranscript: "Hello OpenFriend. Please tell me one cheerful sentence.",
    });

    expect(result.passed).toBe(true);
    expect(result.checks).toEqual({
      assistantResponse: true,
      audioResponse: true,
      cleanClose: true,
      connected: true,
      interruptRequest: true,
      interruption: true,
      responseLatency: true,
      userTranscript: true,
    });
    expect(result.limitations).toContain(
      "Real hardware microphone capture is not covered.",
    );
    expect(result.limitations).toContain(
      "The synthetic turn required an explicit input-buffer commit.",
    );
  });

  it("fails when synthetic speech is not transcribed", () => {
    const result = evaluateSyntheticVoiceRun({
      assistantTranscript: "Hello there.",
      audioStarted: true,
      closed: true,
      connected: true,
      connectionLatencyMs: 482,
      forcedCommit: false,
      interruptRequested: true,
      interrupted: true,
      responseLatencyMs: 731,
      userTranscript: "",
    });

    expect(result.passed).toBe(false);
    expect(result.checks.userTranscript).toBe(false);
  });
});
