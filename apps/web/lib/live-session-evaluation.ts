import type { LiveModelProfileId } from "@openfriend/contracts";

export type LiveTokenUsage = Readonly<{
  uncachedInputTextTokens: number;
  cachedInputTextTokens: number;
  uncachedInputAudioTokens: number;
  cachedInputAudioTokens: number;
  uncachedInputUnknownTokens: number;
  cachedInputUnknownTokens: number;
  outputTextTokens: number;
  outputAudioTokens: number;
  outputUnknownTokens: number;
}>;

type LiveTokenRates = Readonly<{
  inputText: number;
  cachedInputText: number;
  inputAudio: number;
  cachedInputAudio: number;
  outputText: number;
  outputAudio: number;
}>;

export const LIVE_PRICING_AS_OF = "2026-07-26";

const perMillionTokenRates: Record<LiveModelProfileId, LiveTokenRates> = {
  economy: {
    inputText: 0.6,
    cachedInputText: 0.06,
    inputAudio: 10,
    cachedInputAudio: 0.3,
    outputText: 2.4,
    outputAudio: 20,
  },
  quality: {
    inputText: 4,
    cachedInputText: 0.4,
    inputAudio: 32,
    cachedInputAudio: 0.4,
    outputText: 24,
    outputAudio: 64,
  },
};

const usageKeys = [
  "uncachedInputTextTokens",
  "cachedInputTextTokens",
  "uncachedInputAudioTokens",
  "cachedInputAudioTokens",
  "uncachedInputUnknownTokens",
  "cachedInputUnknownTokens",
  "outputTextTokens",
  "outputAudioTokens",
  "outputUnknownTokens",
] as const satisfies readonly (keyof LiveTokenUsage)[];

export function sumLiveUsage(
  updates: readonly LiveTokenUsage[],
): LiveTokenUsage {
  return Object.fromEntries(
    usageKeys.map((key) => [
      key,
      updates.reduce((total, update) => total + update[key], 0),
    ]),
  ) as unknown as LiveTokenUsage;
}

export function estimateLiveSessionCostUsd(
  profileId: LiveModelProfileId,
  updates: readonly LiveTokenUsage[],
): number | null {
  const usage = sumLiveUsage(updates);
  const tokenCount = usageKeys.reduce((total, key) => total + usage[key], 0);

  if (tokenCount === 0) {
    return null;
  }

  const rates = perMillionTokenRates[profileId];
  const cost =
    usage.uncachedInputTextTokens * rates.inputText +
    usage.cachedInputTextTokens * rates.cachedInputText +
    usage.uncachedInputAudioTokens * rates.inputAudio +
    usage.cachedInputAudioTokens * rates.cachedInputAudio +
    usage.uncachedInputUnknownTokens * rates.inputAudio +
    usage.cachedInputUnknownTokens *
      Math.max(rates.cachedInputText, rates.cachedInputAudio) +
    usage.outputTextTokens * rates.outputText +
    usage.outputAudioTokens * rates.outputAudio +
    usage.outputUnknownTokens * Math.max(rates.outputText, rates.outputAudio);

  return cost / 1_000_000;
}

export function medianLatencyMs(samples: readonly number[]): number | null {
  const validSamples = samples
    .filter((sample) => Number.isFinite(sample) && sample >= 0)
    .sort((left, right) => left - right);

  if (validSamples.length === 0) {
    return null;
  }

  const middle = Math.floor(validSamples.length / 2);

  if (validSamples.length % 2 === 1) {
    return validSamples[middle] ?? null;
  }

  return ((validSamples[middle - 1] ?? 0) + (validSamples[middle] ?? 0)) / 2;
}
