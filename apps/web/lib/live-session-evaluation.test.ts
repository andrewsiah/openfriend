import { describe, expect, it } from "vitest";

import {
  estimateLiveSessionCostUsd,
  medianLatencyMs,
  sumLiveUsage,
} from "./live-session-evaluation";

const oneThousandOfEach = {
  uncachedInputTextTokens: 1_000,
  cachedInputTextTokens: 1_000,
  uncachedInputAudioTokens: 1_000,
  cachedInputAudioTokens: 1_000,
  uncachedInputUnknownTokens: 0,
  cachedInputUnknownTokens: 0,
  outputTextTokens: 1_000,
  outputAudioTokens: 1_000,
  outputUnknownTokens: 0,
} as const;

describe("live session evaluation", () => {
  it("prices Economy text, cached input, and audio tokens", () => {
    expect(
      estimateLiveSessionCostUsd("economy", [oneThousandOfEach]),
    ).toBeCloseTo(0.03336, 8);
  });

  it("prices Quality text, cached input, and audio tokens", () => {
    expect(
      estimateLiveSessionCostUsd("quality", [oneThousandOfEach]),
    ).toBeCloseTo(0.1248, 8);
  });

  it("aggregates repeated usage updates without adding cached tokens twice", () => {
    expect(
      sumLiveUsage([
        {
          ...oneThousandOfEach,
          uncachedInputTextTokens: 250,
          cachedInputTextTokens: 750,
        },
        {
          ...oneThousandOfEach,
          uncachedInputTextTokens: 500,
          cachedInputTextTokens: 500,
        },
      ]),
    ).toEqual({
      uncachedInputTextTokens: 750,
      cachedInputTextTokens: 1_250,
      uncachedInputAudioTokens: 2_000,
      cachedInputAudioTokens: 2_000,
      uncachedInputUnknownTokens: 0,
      cachedInputUnknownTokens: 0,
      outputTextTokens: 2_000,
      outputAudioTokens: 2_000,
      outputUnknownTokens: 0,
    });
  });

  it("uses the higher audio rate for unknown tokens", () => {
    const unknownOnly = {
      uncachedInputTextTokens: 0,
      cachedInputTextTokens: 0,
      uncachedInputAudioTokens: 0,
      cachedInputAudioTokens: 0,
      uncachedInputUnknownTokens: 1_000,
      cachedInputUnknownTokens: 1_000,
      outputTextTokens: 0,
      outputAudioTokens: 0,
      outputUnknownTokens: 1_000,
    };

    expect(estimateLiveSessionCostUsd("economy", [unknownOnly])).toBeCloseTo(
      0.0303,
      8,
    );
  });

  it("reports cost as unavailable without non-zero provider usage", () => {
    expect(estimateLiveSessionCostUsd("economy", [])).toBeNull();
    expect(
      estimateLiveSessionCostUsd("economy", [
        {
          ...oneThousandOfEach,
          uncachedInputTextTokens: 0,
          cachedInputTextTokens: 0,
          uncachedInputAudioTokens: 0,
          cachedInputAudioTokens: 0,
          outputTextTokens: 0,
          outputAudioTokens: 0,
        },
      ]),
    ).toBeNull();
  });

  it("returns the median of valid latency samples", () => {
    expect(medianLatencyMs([500, 200, 300])).toBe(300);
    expect(medianLatencyMs([400, 100, 300, 200])).toBe(250);
    expect(medianLatencyMs([Number.NaN, -1, 260])).toBe(260);
    expect(medianLatencyMs([])).toBeNull();
  });
});
