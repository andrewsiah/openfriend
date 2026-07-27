import type { LiveModelProfileId } from "@openfriend/contracts";

import type { LiveTokenUsage } from "../../lib/live-session-evaluation";

export type SyntheticVoiceEvidence = {
  assistantTranscript: string;
  audioStarted: boolean;
  closed: boolean;
  connected: boolean;
  connectionLatencyMs: number | null;
  forcedCommit: boolean;
  interruptRequested: boolean;
  interrupted: boolean;
  responseLatencyMs: number | null;
  userTranscript: string;
};

export type SyntheticVoiceResult = Readonly<{
  checks: Readonly<{
    assistantResponse: boolean;
    audioResponse: boolean;
    cleanClose: boolean;
    connected: boolean;
    interruptRequest: boolean;
    interruption: boolean;
    responseLatency: boolean;
    userTranscript: boolean;
  }>;
  evidence: SyntheticVoiceEvidence;
  limitations: readonly string[];
  passed: boolean;
}>;

export type SyntheticProfileEvidence = Readonly<{
  assistantTranscript: string;
  audioStarted: boolean;
  closed: boolean;
  connected: boolean;
  connectionLatencyMs: number | null;
  finalizedUserTurns: number;
  naturalInterruption: boolean;
  profile: LiveModelProfileId;
  recordingBytes: number;
  responseLatencyMs: readonly number[];
  usage: LiveTokenUsage;
  userTranscript: string;
}>;

export type SyntheticPairedVoiceResult = Readonly<{
  evidence: readonly SyntheticProfileEvidence[];
  failureProfiles: readonly LiveModelProfileId[];
  limitations: readonly string[];
  passed: boolean;
}>;

function hasUsage(usage: LiveTokenUsage): boolean {
  return Object.values(usage).some((count) => count > 0);
}

function isCompleteProfile(evidence: SyntheticProfileEvidence): boolean {
  return (
    evidence.assistantTranscript.trim().length > 0 &&
    evidence.audioStarted &&
    evidence.closed &&
    evidence.connected &&
    evidence.connectionLatencyMs !== null &&
    Number.isFinite(evidence.connectionLatencyMs) &&
    evidence.connectionLatencyMs >= 0 &&
    evidence.finalizedUserTurns === 3 &&
    evidence.naturalInterruption &&
    Number.isFinite(evidence.recordingBytes) &&
    evidence.recordingBytes > 0 &&
    evidence.responseLatencyMs.length >= 3 &&
    evidence.responseLatencyMs.every(
      (latency) => Number.isFinite(latency) && latency >= 0,
    ) &&
    hasUsage(evidence.usage) &&
    evidence.userTranscript.trim().length > 0
  );
}

export function evaluateSyntheticPairedVoiceRun(
  evidence: readonly SyntheticProfileEvidence[],
): SyntheticPairedVoiceResult {
  const expectedProfiles: readonly LiveModelProfileId[] = [
    "economy",
    "quality",
  ];
  const profileOrderMatches =
    evidence.length === expectedProfiles.length &&
    evidence.every(
      (profileEvidence, index) =>
        profileEvidence.profile === expectedProfiles[index],
    );
  const failureProfiles = evidence
    .filter((profileEvidence) => !isCompleteProfile(profileEvidence))
    .map((profileEvidence) => profileEvidence.profile);

  return {
    evidence,
    failureProfiles,
    limitations: [
      "Real hardware microphone capture is not covered.",
      "Echo cancellation, noise suppression, automatic gain control, and device switching are not covered.",
    ],
    passed: profileOrderMatches && failureProfiles.length === 0,
  };
}

export function evaluateSyntheticVoiceRun(
  evidence: SyntheticVoiceEvidence,
): SyntheticVoiceResult {
  const checks = {
    assistantResponse: evidence.assistantTranscript.trim().length > 0,
    audioResponse: evidence.audioStarted,
    cleanClose: evidence.closed,
    connected: evidence.connected && evidence.connectionLatencyMs !== null,
    interruptRequest: evidence.interruptRequested,
    interruption: evidence.interrupted,
    responseLatency: evidence.responseLatencyMs !== null,
    userTranscript: evidence.userTranscript.trim().length > 0,
  };

  const limitations = [
    "Real hardware microphone capture is not covered.",
    "Echo cancellation, automatic gain control, and device switching are not covered.",
  ];

  if (evidence.forcedCommit) {
    limitations.push(
      "The synthetic turn required an explicit input-buffer commit.",
    );
  }

  return {
    checks,
    evidence,
    limitations,
    passed: Object.values(checks).every(Boolean),
  };
}
