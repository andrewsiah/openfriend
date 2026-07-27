import {
  OpenAIRealtimeWebRTC,
  RealtimeAgent,
  RealtimeSession,
  type RealtimeItem,
} from "@openai/agents/realtime";

import {
  evaluateSyntheticVoiceRun,
  type SyntheticVoiceEvidence,
} from "./result";

declare global {
  interface Window {
    __openfriendSyntheticVoiceResult?: ReturnType<
      typeof evaluateSyntheticVoiceRun
    >;
  }
}

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

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

function messageTranscript(
  history: RealtimeItem[],
  role: "assistant" | "user",
): string {
  return history
    .flatMap((item) => {
      if (item.type !== "message" || item.role !== role) {
        return [];
      }

      return item.content.map((content) => {
        if (content.type === "input_text" || content.type === "output_text") {
          return content.text;
        }

        return content.transcript ?? "";
      });
    })
    .join(" ")
    .trim();
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

async function playFixture(
  audioContext: AudioContext,
  destination: MediaStreamAudioDestinationNode,
  fixture: AudioBuffer,
): Promise<void> {
  await new Promise<void>((resolve) => {
    const source = audioContext.createBufferSource();
    source.buffer = fixture;
    source.connect(destination);
    source.addEventListener("ended", () => resolve(), { once: true });
    source.start();
  });
}

async function waitForEvidence(
  evidence: SyntheticVoiceEvidence,
  timeoutMs: number,
): Promise<void> {
  const deadline = performance.now() + timeoutMs;

  while (performance.now() < deadline) {
    if (
      evidence.audioStarted &&
      evidence.assistantTranscript.length > 0 &&
      evidence.interrupted &&
      evidence.responseLatencyMs !== null &&
      evidence.userTranscript.length > 0
    ) {
      return;
    }

    await delay(100);
  }

  throw new Error(
    "Timed out waiting for complete synthetic Realtime evidence.",
  );
}

async function runSyntheticConversation(): Promise<void> {
  startButton.disabled = true;
  statusElement.textContent = "Preparing synthetic speech…";
  outputElement.textContent = "";

  const evidence: SyntheticVoiceEvidence = {
    assistantTranscript: "",
    audioStarted: false,
    closed: false,
    connected: false,
    connectionLatencyMs: null,
    forcedCommit: false,
    interruptRequested: false,
    interrupted: false,
    responseLatencyMs: null,
    userTranscript: "",
  };

  const audioContext = new AudioContext({ sampleRate: 48_000 });
  const inputDestination = audioContext.createMediaStreamDestination();
  const outputAudio = document.createElement("audio");
  outputAudio.autoplay = true;
  outputAudio.muted = true;
  const transport = new OpenAIRealtimeWebRTC({
    audioElement: outputAudio,
    mediaStream: inputDestination.stream,
  });
  const agent = new RealtimeAgent({
    name: "OpenFriend synthetic acceptance",
    instructions:
      "You are OpenFriend. Answer each question warmly in at least twenty words so interruption can be tested.",
  });
  let session: RealtimeSession | undefined;
  let peerConnection: RTCPeerConnection | undefined;

  try {
    await audioContext.resume();
    const [firstFixture, interruptionFixture] = await Promise.all([
      decodeFixture(audioContext, "/first.wav"),
      decodeFixture(audioContext, "/interrupt.wav"),
    ]);

    statusElement.textContent = "Fetching short-lived credential…";
    const secretResponse = await fetch("/api/realtime/client-secret", {
      body: JSON.stringify({ profile: "economy" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
    });

    if (!secretResponse.ok) {
      throw new Error("The short-lived credential route rejected the request.");
    }

    const secretBody: unknown = await secretResponse.json();

    if (
      typeof secretBody !== "object" ||
      secretBody === null ||
      typeof (secretBody as Record<string, unknown>).clientSecret !==
        "string" ||
      typeof (secretBody as Record<string, unknown>).model !== "string"
    ) {
      throw new Error("The short-lived credential response was invalid.");
    }

    const { clientSecret, model } = secretBody as {
      clientSecret: string;
      model: string;
    };
    session = new RealtimeSession(agent, {
      model,
      tracingDisabled: true,
      transport,
    });

    let firstUtteranceEndedAt: number | null = null;
    let firstSpeechStoppedAt: number | null = null;
    let interruptionScheduled = false;

    session.on("history_updated", (history) => {
      evidence.userTranscript = messageTranscript(history, "user");
      evidence.assistantTranscript = messageTranscript(history, "assistant");
    });
    transport.on("*", (event) => {
      if (
        event.type === "input_audio_buffer.speech_stopped" &&
        firstSpeechStoppedAt === null
      ) {
        firstSpeechStoppedAt = performance.now();
      }

      if (event.type === "output_audio_buffer.cleared") {
        evidence.interrupted = true;
      }
    });
    transport.on("turn_started", () => {
      evidence.audioStarted = true;
      const responseAnchor = firstSpeechStoppedAt ?? firstUtteranceEndedAt;

      if (responseAnchor !== null && evidence.responseLatencyMs === null) {
        evidence.responseLatencyMs = Math.round(
          performance.now() - responseAnchor,
        );
      }

      if (!interruptionScheduled) {
        interruptionScheduled = true;
        window.setTimeout(() => {
          const interruptionPlayback = playFixture(
            audioContext,
            inputDestination,
            interruptionFixture,
          );

          window.setTimeout(() => {
            evidence.interruptRequested = true;
            session?.interrupt();
          }, 250);
          void interruptionPlayback;
        }, 500);
      }
    });

    const connectionStartedAt = performance.now();
    statusElement.textContent = "Connecting to the real Realtime transport…";
    await session.connect({ apiKey: clientSecret });
    evidence.connected = true;
    evidence.connectionLatencyMs = Math.round(
      performance.now() - connectionStartedAt,
    );
    peerConnection = transport.connectionState.peerConnection;

    statusElement.textContent = "Playing synthetic speech into WebRTC…";
    await playFixture(audioContext, inputDestination, firstFixture);
    firstUtteranceEndedAt = performance.now();
    await delay(900);

    if (!evidence.audioStarted) {
      if (evidence.userTranscript.length === 0) {
        evidence.forcedCommit = true;
        transport.sendEvent({ type: "input_audio_buffer.commit" });
        await delay(100);
      }

      transport.requestResponse();
    }

    await waitForEvidence(evidence, 30_000);
  } finally {
    session?.close();
    inputDestination.stream.getTracks().forEach((track) => track.stop());
    await audioContext.close();
    await delay(50);
    evidence.closed =
      transport.status === "disconnected" &&
      (!peerConnection || peerConnection.connectionState === "closed");

    const result = evaluateSyntheticVoiceRun(evidence);
    window.__openfriendSyntheticVoiceResult = result;
    outputElement.textContent = JSON.stringify(result, null, 2);
    statusElement.textContent = result.passed
      ? "Passed synthetic Realtime acceptance."
      : "Synthetic Realtime acceptance did not pass.";
    startButton.disabled = false;
  }
}

startButton.addEventListener("click", () => {
  void runSyntheticConversation().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "Unknown error.";
    outputElement.textContent = JSON.stringify(
      {
        error: message,
        result: window.__openfriendSyntheticVoiceResult,
      },
      null,
      2,
    );
    statusElement.textContent = "Synthetic Realtime acceptance failed.";
    startButton.disabled = false;
  });
});
