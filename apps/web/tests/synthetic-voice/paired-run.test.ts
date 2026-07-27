import { describe, expect, it, vi } from "vitest";

import type { LiveTokenUsage } from "../../lib/live-session-evaluation";
import type { SyntheticProfileEvidence } from "./result";
import { runSyntheticProfilePair, SYNTHETIC_PAIRED_GUIDE } from "./paired-run";

const usage: LiveTokenUsage = {
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

function evidence(profile: "economy" | "quality"): SyntheticProfileEvidence {
  return {
    assistantTranscript: "Synthetic assistant response.",
    audioStarted: true,
    closed: true,
    connected: true,
    connectionLatencyMs: 400,
    finalizedUserTurns: 3,
    naturalInterruption: true,
    profile,
    recordingBytes: 2048,
    responseLatencyMs: [300, 400, 500],
    usage,
    userTranscript: "Three synthetic prompts.",
  };
}

describe("runSyntheticProfilePair", () => {
  it("runs Economy then Quality with the same immutable guide", async () => {
    const guides: (readonly string[])[] = [];
    const runProfile = vi.fn(async (profile, guide: readonly string[]) => {
      guides.push(guide);
      return evidence(profile);
    });

    const result = await runSyntheticProfilePair(runProfile);

    expect(runProfile.mock.calls.map(([profile]) => profile)).toEqual([
      "economy",
      "quality",
    ]);
    expect(guides[0]).toBe(SYNTHETIC_PAIRED_GUIDE);
    expect(guides[1]).toBe(SYNTHETIC_PAIRED_GUIDE);
    expect(Object.isFrozen(SYNTHETIC_PAIRED_GUIDE)).toBe(true);
    expect(result.map((profileResult) => profileResult.profile)).toEqual([
      "economy",
      "quality",
    ]);
  });

  it("does not begin Quality before Economy resolves", async () => {
    let resolveEconomy:
      ((profileEvidence: SyntheticProfileEvidence) => void) | undefined;
    const economyResult = new Promise<SyntheticProfileEvidence>((resolve) => {
      resolveEconomy = resolve;
    });
    const calls: string[] = [];
    const runProfile = vi.fn((profile: "economy" | "quality") => {
      calls.push(profile);
      return profile === "economy"
        ? economyResult
        : Promise.resolve(evidence("quality"));
    });

    const pairPromise = runSyntheticProfilePair(runProfile);
    await Promise.resolve();

    expect(calls).toEqual(["economy"]);
    resolveEconomy?.(evidence("economy"));
    await pairPromise;
    expect(calls).toEqual(["economy", "quality"]);
  });

  it("identifies the profile that failed", async () => {
    await expect(
      runSyntheticProfilePair(async (profile) => {
        if (profile === "quality") {
          throw new Error("transport timeout");
        }

        return evidence(profile);
      }),
    ).rejects.toThrow("Synthetic quality profile failed: transport timeout");
  });
});
