import type { LiveModelProfileId } from "@openfriend/contracts";

import type { SyntheticProfileEvidence } from "./result";
import { SYNTHETIC_PAIRED_GUIDE } from "./spoken-guide.mjs";

export { SYNTHETIC_PAIRED_GUIDE };

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
