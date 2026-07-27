import type { LiveModelProfileId } from "@openfriend/contracts";

import type { SyntheticProfileEvidence } from "./result";

export type SyntheticProfileRunner = (
  profile: LiveModelProfileId,
) => Promise<SyntheticProfileEvidence>;

export async function runSyntheticProfilePair(
  runProfile: SyntheticProfileRunner,
  onProfileComplete: (evidence: SyntheticProfileEvidence) => void = () =>
    undefined,
): Promise<readonly SyntheticProfileEvidence[]> {
  const results: SyntheticProfileEvidence[] = [];

  for (const profile of ["economy", "quality"] as const) {
    try {
      const evidence = await runProfile(profile);
      results.push(evidence);
      onProfileComplete(evidence);
    } catch (error) {
      const detail =
        error instanceof Error ? error.message : "Unknown synthetic run error.";
      throw new Error(`Synthetic ${profile} profile failed: ${detail}`);
    }
  }

  return results;
}
