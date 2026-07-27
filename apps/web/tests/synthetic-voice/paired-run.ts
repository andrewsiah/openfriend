import type { LiveModelProfileId } from "@openfriend/contracts";

import type { SyntheticProfileEvidence } from "./result";

export const SYNTHETIC_PAIRED_GUIDE = Object.freeze([
  "I’ve had a long day. Help me reset in one minute.",
  "Help me choose between a quiet evening and seeing friends. Ask me one question before advising.",
  "Actually, make that practical: give me one next step.",
] as const);

export type SyntheticProfileRunner = (
  profile: LiveModelProfileId,
  guide: typeof SYNTHETIC_PAIRED_GUIDE,
) => Promise<SyntheticProfileEvidence>;

export async function runSyntheticProfilePair(
  runProfile: SyntheticProfileRunner,
): Promise<readonly SyntheticProfileEvidence[]> {
  const results: SyntheticProfileEvidence[] = [];

  for (const profile of ["economy", "quality"] as const) {
    try {
      results.push(await runProfile(profile, SYNTHETIC_PAIRED_GUIDE));
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown synthetic run error.";
      throw new Error(`Synthetic ${profile} profile failed: ${detail}`);
    }
  }

  return results;
}
