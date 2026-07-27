import type { LiveModelProfileId } from "@openfriend/contracts";
import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession,
} from "@openai/agents/realtime";

import { OPENFRIEND_REALTIME_INSTRUCTIONS } from "../../lib/live-agent-config";
import {
  estimateLiveSessionCostUsd,
  medianLatencyMs,
  sumLiveUsage,
  type LiveTokenUsage,
} from "../../lib/live-session-evaluation";
import type {
  LiveHistoryItem,
  LiveSessionCallbacks,
} from "../../lib/live-session";
import {
  OpenAILiveSession,
  type OpenAISdkSession,
} from "../../lib/openai-live-session";
import { playSyntheticFixture } from "./fixture-playback";
import {
  runSyntheticProfilePair,
  type SyntheticProfileRunner,
} from "./paired-run";
import {
  evaluateSyntheticPairedVoiceRun,
  type SyntheticPairedVoiceResult,
  type SyntheticProfileEvidence,
} from "./result";

type ClientSecret = Readonly<{
  clientSecret: string;
  model: string;
}>;

type ProfileArtifact = Readonly<{
  evidence: SyntheticProfileEvidence;
  recording: Blob;
}>;

type RecordingController = Readonly<{
  ready: Promise<void>;
  stop: () => Promise<Blob>;
}>;

type PresentedPairResult = Readonly<{
  evaluation: SyntheticPairedVoiceResult;
  metrics: readonly Readonly<{
    estimatedCostUsd: number | null;
    medianResponseStartMs: number | null;
    profile: LiveModelProfileId;
  }>[];
}>;

declare global {
  interface Window {
    __openfriendSyntheticVoiceResult?: PresentedPairResult;
  }
}

const fixturePaths = ["/reset.wav", "/decision.wav", "/redirect.wav"] as const;
const activeRecordingUrls: string[] = [];

function getRequiredElement<ElementType extends Element>(
  selector: string,
): ElementType {
  const element = document.querySelector<ElementType>(selector);

  if (!element) {
    throw new Error(`Synthetic voice harness control is missing: ${selector}`);
  }

  return element;
}

const startButton = getRequiredElement<HTMLButtonElement>("#start");
const statusElement = getRequiredElement<HTMLElement>("#status");
const outputElement = getRequiredElement<HTMLElement>("#output");
const recordingsElement = getRequiredElement<HTMLElement>("#recordings");

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

async function waitFor(
  description: string,
  predicate: () => boolean,
  timeoutMs = 45_000,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;

  while (performance.now() < deadline) {
    if (predicate()) {
      return;
    }

    await delay(100);
  }

  throw new Error(`Timed out waiting for ${description}.`);
}

async function decodeFixture(
  audioContext: AudioContext,
  path: string,
): Promise<AudioBuffer> {
  const response = await fetch(path);

  if (!response.ok) {
    throw new Error(`Unable to load synthetic audio fixture: ${path}`);
  }

  return audioContext.decodeAudioData(await response.arrayBuffer());
}

function createRecordingController(
  outputAudio: HTMLAudioElement,
): RecordingController {
  const chunks: Blob[] = [];
  let recorder: MediaRecorder | undefined;
  let resolveReady: (() => void) | undefined;
  let rejectReady: ((error: unknown) => void) | undefined;
  let resolveStopped: ((recording: Blob) => void) | undefined;
  const ready = new Promise<void>((resolve, reject) => {
    resolveReady = resolve;
    rejectReady = reject;
  });
  const stopped = new Promise<Blob>((resolve) => {
    resolveStopped = resolve;
  });

  outputAudio.addEventListener(
    "loadedmetadata",
    () => {
      try {
        if (!(outputAudio.srcObject instanceof MediaStream)) {
          throw new Error("Realtime output stream is unavailable.");
        }

        const options = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? { mimeType: "audio/webm;codecs=opus" }
          : undefined;
        recorder = new MediaRecorder(outputAudio.srcObject, options);
        recorder.addEventListener("dataavailable", (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        });
        recorder.addEventListener(
          "stop",
          () => {
            resolveStopped?.(
              new Blob(chunks, {
                type: recorder?.mimeType || "audio/webm",
              }),
            );
          },
          { once: true },
        );
        recorder.start(250);
        resolveReady?.();
      } catch (error) {
        rejectReady?.(error);
      }
    },
    { once: true },
  );

  return {
    ready,
    async stop() {
      await ready;

      if (!recorder) {
        throw new Error("Realtime output recorder did not start.");
      }

      if (recorder.state !== "inactive") {
        recorder.stop();
      }

      return stopped;
    },
  };
}

async function requestClientSecret(
  profile: LiveModelProfileId,
): Promise<ClientSecret> {
  const response = await fetch("/api/realtime/client-secret", {
    body: JSON.stringify({ profile }),
    headers: { "Content-Type": "application/json" },
    method: "POST",
  });

  if (!response.ok) {
    throw new Error(`The ${profile} client-secret request was rejected.`);
  }

  const value: unknown = await response.json();

  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Record<string, unknown>).clientSecret !== "string" ||
    !(value as { clientSecret: string }).clientSecret.startsWith("ek_") ||
    typeof (value as Record<string, unknown>).model !== "string"
  ) {
    throw new Error(`The ${profile} client-secret response was invalid.`);
  }

  return value as ClientSecret;
}

function finalizedTranscript(
  history: readonly LiveHistoryItem[],
  role: "assistant" | "user",
): string {
  return history
    .filter((item) => item.role === role && item.status === "completed")
    .map((item) => item.text)
    .join(" ")
    .trim();
}

function renderRecordings(
  recordings: ReadonlyMap<LiveModelProfileId, Blob>,
): void {
  activeRecordingUrls.splice(0).forEach((url) => URL.revokeObjectURL(url));
  recordingsElement.replaceChildren();

  for (const profile of ["economy", "quality"] as const) {
    const recording = recordings.get(profile);

    if (!recording) {
      continue;
    }

    const url = URL.createObjectURL(recording);
    activeRecordingUrls.push(url);
    const article = document.createElement("article");
    article.className = "recording";
    const heading = document.createElement("h2");
    heading.textContent = profile === "economy" ? "Economy" : "Quality";
    const audio = document.createElement("audio");
    audio.controls = true;
    audio.src = url;
    const download = document.createElement("a");
    download.download = `openfriend-synthetic-${profile}.webm`;
    download.href = url;
    download.textContent = `Download ${heading.textContent} recording`;
    article.append(heading, audio, download);
    recordingsElement.append(article);
  }
}

async function runSyntheticProfile(
  profile: LiveModelProfileId,
): Promise<ProfileArtifact> {
  statusElement.textContent = `Preparing synthetic ${profile} speech…`;
  const { clientSecret, model } = await requestClientSecret(profile);
  const audioContext = new AudioContext({ sampleRate: 48_000 });
  const inputDestination = audioContext.createMediaStreamDestination();
  const outputAudio = document.createElement("audio");
  outputAudio.autoplay = true;
  outputAudio.muted = true;
  const recording = createRecordingController(outputAudio);
  const transport = new OpenAIRealtimeWebRTC({
    audioElement: outputAudio,
    mediaStream: inputDestination.stream,
  });
  let history: readonly LiveHistoryItem[] = [];
  let connected = false;
  let connectionLatencyMs: number | null = null;
  let latestSpeechStoppedAt: number | null = null;
  let naturalInterruption = false;
  let outputStartedCount = 0;
  let outputStoppedCount = 0;
  let recordingBlob: Blob | undefined;
  const responseLatencyMs: number[] = [];
  const usageUpdates: LiveTokenUsage[] = [];
  const callbacks: LiveSessionCallbacks = {
    onConnectionChange(status) {
      if (status === "connected") {
        connected = true;
      }
    },
    onHistoryChange(nextHistory) {
      history = nextHistory;
    },
    onResponseStart() {
      outputStartedCount += 1;

      if (latestSpeechStoppedAt !== null) {
        responseLatencyMs.push(
          Math.max(0, Math.round(performance.now() - latestSpeechStoppedAt)),
        );
        latestSpeechStoppedAt = null;
      }
    },
    onUsageUpdate(usage) {
      usageUpdates.push(usage);
    },
    onUserSpeechStopped() {
      latestSpeechStoppedAt = performance.now();
    },
  };
  const liveSession = new OpenAILiveSession({
    agent: {
      name: "OpenFriend",
      instructions: OPENFRIEND_REALTIME_INSTRUCTIONS,
    },
    callbacks,
    createSdkSession(agentConfig, sessionModel) {
      const agent = new RealtimeAgent(agentConfig);
      return new RealtimeSession(agent, {
        config: {
          audio: {
            input: {
              noiseReduction: { type: "near_field" },
              turnDetection: {
                createResponse: true,
                eagerness: "low",
                interruptResponse: true,
                type: "semantic_vad",
              },
            },
          },
        },
        model: sessionModel,
        tracingDisabled: true,
        transport,
      }) as unknown as OpenAISdkSession;
    },
    model,
  });

  transport.on("*", (event) => {
    if (event.type === "output_audio_buffer.cleared") {
      naturalInterruption = true;
    }

    if (event.type === "output_audio_buffer.stopped") {
      outputStoppedCount += 1;
    }
  });

  try {
    await audioContext.resume();
    const fixtures = await Promise.all(
      fixturePaths.map((path) => decodeFixture(audioContext, path)),
    );
    const connectionStartedAt = performance.now();
    statusElement.textContent = `Connecting synthetic ${profile} session…`;
    await liveSession.connect(clientSecret);
    connectionLatencyMs = Math.max(
      0,
      Math.round(performance.now() - connectionStartedAt),
    );

    statusElement.textContent = `Running synthetic ${profile} guide step 1…`;
    await playSyntheticFixture(audioContext, inputDestination, fixtures[0]);
    await waitFor(
      `${profile} first completed response`,
      () =>
        history.filter(
          (item) => item.role === "user" && item.status === "completed",
        ).length >= 1 &&
        history.filter(
          (item) => item.role === "assistant" && item.status === "completed",
        ).length >= 1 &&
        outputStoppedCount >= 1,
    );

    statusElement.textContent = `Running synthetic ${profile} guide step 2…`;
    await playSyntheticFixture(audioContext, inputDestination, fixtures[1]);
    await waitFor(
      `${profile} second response audio`,
      () => outputStartedCount >= 2,
    );

    statusElement.textContent = `Interrupting synthetic ${profile} response with step 3…`;
    await playSyntheticFixture(audioContext, inputDestination, fixtures[2]);
    await waitFor(
      `${profile} final response and evidence`,
      () =>
        history.filter(
          (item) => item.role === "user" && item.status === "completed",
        ).length >= 3 &&
        history.filter(
          (item) => item.role === "assistant" && item.status === "completed",
        ).length >= 2 &&
        naturalInterruption &&
        outputStartedCount >= 3 &&
        outputStoppedCount >= 2 &&
        responseLatencyMs.length >= 3 &&
        usageUpdates.length > 0,
    );

    await recording.ready;
    recordingBlob = await recording.stop();
  } finally {
    liveSession.close();
    inputDestination.stream.getTracks().forEach((track) => track.stop());
    if (outputAudio.srcObject instanceof MediaStream) {
      outputAudio.srcObject.getTracks().forEach((track) => track.stop());
    }
    await audioContext.close();
  }

  if (!recordingBlob) {
    throw new Error(`The ${profile} response recording is unavailable.`);
  }

  return {
    evidence: {
      assistantTranscript: finalizedTranscript(history, "assistant"),
      audioStarted: outputStartedCount > 0,
      closed: transport.status === "disconnected",
      connected,
      connectionLatencyMs,
      finalizedUserTurns: history.filter(
        (item) => item.role === "user" && item.status === "completed",
      ).length,
      naturalInterruption,
      profile,
      recordingBytes: recordingBlob.size,
      responseLatencyMs,
      usage: sumLiveUsage(usageUpdates),
      userTranscript: finalizedTranscript(history, "user"),
    },
    recording: recordingBlob,
  };
}

async function runSyntheticPair(): Promise<void> {
  startButton.disabled = true;
  outputElement.textContent = "";
  recordingsElement.replaceChildren();
  const recordings = new Map<LiveModelProfileId, Blob>();
  const runProfile: SyntheticProfileRunner = async (profile) => {
    const artifact = await runSyntheticProfile(profile);
    recordings.set(profile, artifact.recording);
    return artifact.evidence;
  };

  try {
    const evidence = await runSyntheticProfilePair(runProfile);
    const evaluation = evaluateSyntheticPairedVoiceRun(evidence);
    const result: PresentedPairResult = {
      evaluation,
      metrics: evidence.map((profileEvidence) => ({
        estimatedCostUsd: estimateLiveSessionCostUsd(profileEvidence.profile, [
          profileEvidence.usage,
        ]),
        medianResponseStartMs: medianLatencyMs(
          profileEvidence.responseLatencyMs,
        ),
        profile: profileEvidence.profile,
      })),
    };
    window.__openfriendSyntheticVoiceResult = result;
    outputElement.textContent = JSON.stringify(result, null, 2);
    renderRecordings(recordings);
    statusElement.textContent = evaluation.passed
      ? "Passed synthetic Economy + Quality acceptance. Listen and rate later."
      : "Synthetic paired Realtime acceptance did not pass.";
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error.";
    outputElement.textContent = JSON.stringify({ error: message }, null, 2);
    statusElement.textContent = "Synthetic paired Realtime acceptance failed.";
  } finally {
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", () => {
  void runSyntheticPair();
});
