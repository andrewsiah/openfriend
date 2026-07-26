import {
  RealtimeAgent,
  RealtimeSession,
  type RealtimeItem,
} from "@openai/agents/realtime";

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

export interface OpenAISdkSession {
  connect(options: { apiKey: string }): Promise<void>;
  interrupt(): void;
  close(): void;
  on(event: "history_updated", listener: HistoryListener): void;
  off(event: "history_updated", listener: HistoryListener): void;
  transport: {
    on(event: "connection_change", listener: ConnectionListener): void;
    on(event: "turn_started", listener: ResponseStartListener): void;
    off(event: "connection_change", listener: ConnectionListener): void;
    off(event: "turn_started", listener: ResponseStartListener): void;
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

export class OpenAILiveSession implements LiveSession {
  private closed = false;
  private readonly callbacks: LiveSessionCallbacks;
  private readonly handleConnectionChange: ConnectionListener;
  private readonly handleHistoryChange: HistoryListener;
  private readonly handleResponseStart: ResponseStartListener;
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
    this.sdkSession.transport.on(
      "connection_change",
      this.handleConnectionChange,
    );
    this.sdkSession.on("history_updated", this.handleHistoryChange);
    this.sdkSession.transport.on("turn_started", this.handleResponseStart);
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
    this.sdkSession.transport.off("turn_started", this.handleResponseStart);
    this.sdkSession.close();
  }
}
