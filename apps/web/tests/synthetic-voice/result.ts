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
