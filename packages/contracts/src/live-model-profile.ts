export type LiveModelProfileId = "economy" | "quality";

export interface LiveModelProfile {
  readonly id: LiveModelProfileId;
  readonly provider: "openai";
  readonly model: string;
  readonly displayName: string;
  readonly description: string;
  readonly tier: "lower-cost" | "higher-quality";
  readonly capabilities: {
    readonly fullDuplexAudio: true;
    readonly interruption: true;
    readonly toolUse: true;
  };
}

const requiredCapabilities = {
  fullDuplexAudio: true,
  interruption: true,
  toolUse: true,
} as const;

const liveModelProfiles = [
  {
    id: "economy",
    provider: "openai",
    model: "gpt-realtime-2.1-mini",
    displayName: "Economy",
    description: "Lower-cost Realtime voice for development and routine use.",
    tier: "lower-cost",
    capabilities: requiredCapabilities,
  },
  {
    id: "quality",
    provider: "openai",
    model: "gpt-realtime-2.1",
    displayName: "Quality",
    description: "Full Realtime model for conversation-quality comparison.",
    tier: "higher-quality",
    capabilities: requiredCapabilities,
  },
] as const satisfies readonly LiveModelProfile[];

export function listLiveModelProfiles(): readonly LiveModelProfile[] {
  return liveModelProfiles;
}

export function getLiveModelProfile(id: string): LiveModelProfile {
  const profile = liveModelProfiles.find((candidate) => candidate.id === id);

  if (!profile) {
    throw new Error(`Unknown live model profile: "${id}"`);
  }

  return profile;
}
