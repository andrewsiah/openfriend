import { describe, expect, it } from "vitest";

import type { LiveTokenUsage } from "../../lib/live-session-evaluation";
import * as resultModule from "./result";
import { evaluateSyntheticVoiceRun } from "./result";

type DesiredSyntheticProfileEvidence = Readonly<{
  assistantTranscript: string;
  audioStarted: boolean;
  closed: boolean;
  connected: boolean;
  connectionLatencyMs: number | null;
  finalizedUserTurns: number;
  naturalInterruption: boolean;
  profile: "economy" | "quality";
  recordingBytes: number;
  responseLatencyMs: readonly number[];
  usage: LiveTokenUsage;
  userTranscript: string;
}>;

type DesiredSyntheticPairedVoiceResult = Readonly<{
  failureProfiles: readonly ("economy" | "quality")[];
  limitations: readonly string[];
  passed: boolean;
}>;

const evaluateSyntheticPairedVoiceRun = (
  resultModule as unknown as {
    evaluateSyntheticPairedVoiceRun: (
      evidence: readonly DesiredSyntheticProfileEvidence[],
    ) => DesiredSyntheticPairedVoiceResult;
  }
).evaluateSyntheticPairedVoiceRun;

const nonzeroUsage: LiveTokenUsage = {
  cachedInputAudioTokens: 0,
  cachedInputTextTokens: 0,
  cachedInputUnknownTokens: 0,
  outputAudioTokens: 80,
  outputTextTokens: 20,
  outputUnknownTokens: 0,
  uncachedInputAudioTokens: 120,
  uncachedInputTextTokens: 10,
  uncachedInputUnknownTokens: 0,
};

function completeProfile(
  profile: "economy" | "quality",
): DesiredSyntheticProfileEvidence {
  return {
    assistantTranscript: "A warm and useful synthetic response.",
    audioStarted: true,
    closed: true,
    connected: true,
    connectionLatencyMs: 482,
    finalizedUserTurns: 3,
    naturalInterruption: true,
    profile,
    recordingBytes: 4096,
    responseLatencyMs: [410, 530, 460],
    usage: nonzeroUsage,
    userTranscript:
      "Synthetic reset prompt. Synthetic decision prompt. Synthetic redirect.",
  };
}

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

describe("evaluateSyntheticPairedVoiceRun", () => {
  it("passes only for complete Economy then Quality evidence", () => {
    const result = evaluateSyntheticPairedVoiceRun([
      completeProfile("economy"),
      completeProfile("quality"),
    ]);

    expect(result.passed).toBe(true);
    expect(result.failureProfiles).toEqual([]);
    expect(result.limitations).toContain(
      "Real hardware microphone capture is not covered.",
    );
    expect(result.limitations).toContain(
      "Echo cancellation, noise suppression, automatic gain control, and device switching are not covered.",
    );
  });

  it("rejects reversed or duplicate profile runs", () => {
    expect(
      evaluateSyntheticPairedVoiceRun([
        completeProfile("quality"),
        completeProfile("economy"),
      ]).passed,
    ).toBe(false);
    expect(
      evaluateSyntheticPairedVoiceRun([
        completeProfile("economy"),
        completeProfile("economy"),
      ]).passed,
    ).toBe(false);
  });

  it("names a profile with incomplete transport evidence", () => {
    const result = evaluateSyntheticPairedVoiceRun([
      completeProfile("economy"),
      {
        ...completeProfile("quality"),
        finalizedUserTurns: 2,
        naturalInterruption: false,
        recordingBytes: 0,
        usage: {
          ...nonzeroUsage,
          outputAudioTokens: 0,
          outputTextTokens: 0,
          uncachedInputAudioTokens: 0,
          uncachedInputTextTokens: 0,
        },
      },
    ]);

    expect(result.passed).toBe(false);
    expect(result.failureProfiles).toEqual(["quality"]);
  });
});
