import {
  RealtimeAgent,
  RealtimeSession,
  type RealtimeItem,
} from "@openai/agents/realtime";
import type { Usage } from "@openai/agents";

import type { LiveTokenUsage } from "./live-session-evaluation";
import type {
  LiveConnectionStatus,
  LiveHistoryItem,
  LiveSession,
  LiveSessionCallbacks,
} from "./live-session";

type LiveAgentConfig = Readonly<{
  name: string;
  instructions: string;
}>;

type HistoryListener = (history: RealtimeItem[]) => void;
type ConnectionListener = (status: LiveConnectionStatus) => void;
type ResponseStartListener = () => void;
type UsageListener = (usage: Usage) => void;
type UserSpeechStoppedListener = () => void;

export interface OpenAISdkSession {
  connect(options: { apiKey: string }): Promise<void>;
  interrupt(): void;
  close(): void;
  on(event: "history_updated", listener: HistoryListener): void;
  off(event: "history_updated", listener: HistoryListener): void;
  transport: {
    on(event: "connection_change", listener: ConnectionListener): void;
    on(
      event: "input_audio_buffer.speech_stopped",
      listener: UserSpeechStoppedListener,
    ): void;
    on(
      event: "output_audio_buffer.started",
      listener: ResponseStartListener,
    ): void;
    on(event: "usage_update", listener: UsageListener): void;
    off(event: "connection_change", listener: ConnectionListener): void;
    off(
      event: "input_audio_buffer.speech_stopped",
      listener: UserSpeechStoppedListener,
    ): void;
    off(
      event: "output_audio_buffer.started",
      listener: ResponseStartListener,
    ): void;
    off(event: "usage_update", listener: UsageListener): void;
  };
}

export type OpenAISdkSessionFactory = (
  agent: LiveAgentConfig,
  model: string,
) => OpenAISdkSession;

type OpenAILiveSessionOptions = Readonly<{
  agent: LiveAgentConfig;
  model: string;
  callbacks: LiveSessionCallbacks;
  createSdkSession?: OpenAISdkSessionFactory;
}>;

function toLiveHistory(history: RealtimeItem[]): LiveHistoryItem[] {
  return history.flatMap((item) => {
    if (
      item.type !== "message" ||
      (item.role !== "user" && item.role !== "assistant")
    ) {
      return [];
    }

    const text = item.content
      .map((content) => {
        if (content.type === "input_text" || content.type === "output_text") {
          return content.text;
        }

        return content.transcript ?? "";
      })
      .join("");

    return [
      {
        id: item.itemId,
        role: item.role,
        status: item.status,
        text,
      },
    ];
  });
}

function createOpenAISdkSession(
  agentConfig: LiveAgentConfig,
  model: string,
): OpenAISdkSession {
  const agent = new RealtimeAgent(agentConfig);
  return new RealtimeSession(agent, { model });
}

function count(value: unknown): number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0
    ? value
    : 0;
}

function record(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};
}

function sumDetail(
  details: readonly Record<string, number>[],
  key: string,
): number {
  return details.reduce(
    (total, detail) => total + count((detail as Record<string, unknown>)[key]),
    0,
  );
}

function sumCachedModality(
  details: readonly Record<string, number>[],
  key: string,
): number {
  return details.reduce((total, detail) => {
    const cachedDetails = record(
      (detail as Record<string, unknown>).cached_tokens_details,
    );
    return total + count(cachedDetails[key]);
  }, 0);
}

function toLiveTokenUsage(usage: Usage): LiveTokenUsage {
  const inputTextTokens = sumDetail(usage.inputTokensDetails, "text_tokens");
  const inputAudioTokens = sumDetail(usage.inputTokensDetails, "audio_tokens");
  const cachedInputTextTokens = Math.min(
    inputTextTokens,
    sumCachedModality(usage.inputTokensDetails, "text_tokens"),
  );
  const cachedInputAudioTokens = Math.min(
    inputAudioTokens,
    sumCachedModality(usage.inputTokensDetails, "audio_tokens"),
  );
  const inputUnknownTokens = Math.max(
    0,
    count(usage.inputTokens) - inputTextTokens - inputAudioTokens,
  );
  const reportedCachedTokens = sumDetail(
    usage.inputTokensDetails,
    "cached_tokens",
  );
  const cachedInputUnknownTokens = Math.min(
    inputUnknownTokens,
    Math.max(
      0,
      reportedCachedTokens - cachedInputTextTokens - cachedInputAudioTokens,
    ),
  );
  const outputTextTokens = sumDetail(usage.outputTokensDetails, "text_tokens");
  const outputAudioTokens = sumDetail(
    usage.outputTokensDetails,
    "audio_tokens",
  );

  return {
    uncachedInputTextTokens: inputTextTokens - cachedInputTextTokens,
    cachedInputTextTokens,
    uncachedInputAudioTokens: inputAudioTokens - cachedInputAudioTokens,
    cachedInputAudioTokens,
    uncachedInputUnknownTokens: inputUnknownTokens - cachedInputUnknownTokens,
    cachedInputUnknownTokens,
    outputTextTokens,
    outputAudioTokens,
    outputUnknownTokens: Math.max(
      0,
      count(usage.outputTokens) - outputTextTokens - outputAudioTokens,
    ),
  };
}

export class OpenAILiveSession implements LiveSession {
  private closed = false;
  private readonly callbacks: LiveSessionCallbacks;
  private readonly handleConnectionChange: ConnectionListener;
  private readonly handleHistoryChange: HistoryListener;
  private readonly handleResponseStart: ResponseStartListener;
  private readonly handleUsageUpdate: UsageListener;
  private readonly handleUserSpeechStopped: UserSpeechStoppedListener;
  private readonly sdkSession: OpenAISdkSession;

  constructor({
    agent,
    model,
    callbacks,
    createSdkSession = createOpenAISdkSession,
  }: OpenAILiveSessionOptions) {
    this.callbacks = callbacks;
    this.sdkSession = createSdkSession(agent, model);
    this.handleConnectionChange = (status) => {
      this.callbacks.onConnectionChange(status);
    };
    this.handleHistoryChange = (history) => {
      this.callbacks.onHistoryChange(toLiveHistory(history));
    };
    this.handleResponseStart = () => {
      this.callbacks.onResponseStart();
    };
    this.handleUsageUpdate = (usage) => {
      this.callbacks.onUsageUpdate(toLiveTokenUsage(usage));
    };
    this.handleUserSpeechStopped = () => {
      this.callbacks.onUserSpeechStopped();
    };
    this.sdkSession.transport.on(
      "connection_change",
      this.handleConnectionChange,
    );
    this.sdkSession.on("history_updated", this.handleHistoryChange);
    this.sdkSession.transport.on(
      "input_audio_buffer.speech_stopped",
      this.handleUserSpeechStopped,
    );
    this.sdkSession.transport.on(
      "output_audio_buffer.started",
      this.handleResponseStart,
    );
    this.sdkSession.transport.on("usage_update", this.handleUsageUpdate);
  }

  async connect(clientSecret: string): Promise<void> {
    await this.sdkSession.connect({ apiKey: clientSecret });
  }

  interrupt(): void {
    this.sdkSession.interrupt();
  }

  close(): void {
    if (this.closed) {
      return;
    }

    this.closed = true;
    this.sdkSession.off("history_updated", this.handleHistoryChange);
    this.sdkSession.transport.off(
      "connection_change",
      this.handleConnectionChange,
    );
    this.sdkSession.transport.off(
      "input_audio_buffer.speech_stopped",
      this.handleUserSpeechStopped,
    );
    this.sdkSession.transport.off(
      "output_audio_buffer.started",
      this.handleResponseStart,
    );
    this.sdkSession.transport.off("usage_update", this.handleUsageUpdate);
    this.sdkSession.close();
  }
}
