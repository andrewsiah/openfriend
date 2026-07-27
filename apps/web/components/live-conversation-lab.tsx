"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import type {
  LiveModelProfile,
  LiveModelProfileId,
} from "@openfriend/contracts";

import {
  initialLiveSessionState,
  reduceLiveSessionState,
} from "../lib/live-session-state";
import { OPENFRIEND_REALTIME_INSTRUCTIONS } from "../lib/live-agent-config";
import type {
  LiveHistoryItem,
  LiveSession,
  LiveSessionCallbacks,
} from "../lib/live-session";
import { OpenAILiveSession } from "../lib/openai-live-session";
import { LiveProfileSelector } from "./live-profile-selector";

export type LiveSessionFactory = (
  callbacks: LiveSessionCallbacks,
  model: string,
) => LiveSession;
type LiveSessionEvent = Parameters<typeof reduceLiveSessionState>[1];

interface LiveConversationLabProps {
  profiles: readonly LiveModelProfile[];
  createSession?: LiveSessionFactory;
  now?: () => number;
}

const statusCopy = {
  idle: "Idle. Choose a profile, then start when you are ready.",
  connecting: "Connecting. Opening a live conversation.",
  live: "Live. OpenFriend is listening.",
  reconnecting: "Reconnecting. Restoring the live conversation.",
  ended: "Ended. The live conversation is closed.",
  failed: "Failed. The live conversation could not continue.",
} as const;

type RealtimeClientSecret = Readonly<{
  clientSecret: string;
  model: string;
}>;

function getClientSecret(value: unknown): RealtimeClientSecret {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Record<string, unknown>).clientSecret !== "string" ||
    !(value as { clientSecret: string }).clientSecret.startsWith("ek_") ||
    typeof (value as Record<string, unknown>).model !== "string" ||
    (value as { model: string }).model.length === 0
  ) {
    throw new Error("Invalid client secret response");
  }

  return value as RealtimeClientSecret;
}

function createOpenAILiveSession(
  callbacks: LiveSessionCallbacks,
  model: string,
): LiveSession {
  return new OpenAILiveSession({
    agent: {
      name: "OpenFriend",
      instructions: OPENFRIEND_REALTIME_INSTRUCTIONS,
    },
    model,
    callbacks,
  });
}

function readPerformanceClock(): number {
  return performance.now();
}

export function LiveConversationLab({
  profiles,
  createSession = createOpenAILiveSession,
  now = readPerformanceClock,
}: LiveConversationLabProps) {
  const [sessionState, dispatch] = useReducer(
    reduceLiveSessionState,
    initialLiveSessionState,
  );
  const sessionStateRef = useRef(initialLiveSessionState);
  const [selectedProfileId, setSelectedProfileId] =
    useState<LiveModelProfileId>("economy");
  const [transcript, setTranscript] = useState<readonly LiveHistoryItem[]>([]);
  const [connectionLatency, setConnectionLatency] = useState<number | null>(
    null,
  );
  const [responseStartLatency, setResponseStartLatency] = useState<
    number | null
  >(null);
  const connectionStartedAt = useRef<number | null>(null);
  const latestUserSpeechStoppedAt = useRef<number | null>(null);
  const activeSession = useRef<LiveSession | null>(null);
  const connectionAttemptId = useRef(0);
  const isMounted = useRef(true);
  const statusElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      connectionAttemptId.current += 1;
      const sessionToClose = activeSession.current;
      activeSession.current = null;
      sessionToClose?.close();
    };
  }, []);

  function closeActiveSession(): void {
    const sessionToClose = activeSession.current;
    activeSession.current = null;
    sessionToClose?.close();
  }

  function transition(event: LiveSessionEvent) {
    const nextState = reduceLiveSessionState(sessionStateRef.current, event);
    sessionStateRef.current = nextState;
    dispatch(event);
    return nextState;
  }

  function endConversation(): void {
    connectionAttemptId.current += 1;
    closeActiveSession();
    latestUserSpeechStoppedAt.current = null;
    transition({ type: "end" });
    statusElement.current?.focus();
  }

  function resetConversation(): void {
    connectionAttemptId.current += 1;
    closeActiveSession();
    setTranscript([]);
    setConnectionLatency(null);
    setResponseStartLatency(null);
    connectionStartedAt.current = null;
    latestUserSpeechStoppedAt.current = null;
    transition({ type: "reset" });
    statusElement.current?.focus();
  }

  async function requestClientSecret(): Promise<RealtimeClientSecret> {
    const response = await fetch("/api/realtime/client-secret", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ profile: selectedProfileId }),
    });

    if (!response.ok) {
      throw new Error("Client secret request failed");
    }

    return getClientSecret(await response.json());
  }

  async function connectWithFreshSecret(): Promise<void> {
    const attemptId = connectionAttemptId.current + 1;
    connectionAttemptId.current = attemptId;
    connectionStartedAt.current = now();
    latestUserSpeechStoppedAt.current = null;
    let nextSession: LiveSession | null = null;

    try {
      const clientSecret = await requestClientSecret();

      if (
        !isMounted.current ||
        connectionAttemptId.current !== attemptId ||
        (sessionStateRef.current.status !== "connecting" &&
          sessionStateRef.current.status !== "reconnecting")
      ) {
        return;
      }

      nextSession = createSession(
        {
          onConnectionChange(status) {
            if (
              !isMounted.current ||
              connectionAttemptId.current !== attemptId ||
              nextSession === null ||
              activeSession.current !== nextSession
            ) {
              return;
            }

            if (status === "connected") {
              if (connectionStartedAt.current !== null) {
                setConnectionLatency(
                  Math.max(0, Math.round(now() - connectionStartedAt.current)),
                );
              }
              transition({ type: "connected" });
              return;
            }

            if (status === "disconnected") {
              connectionAttemptId.current += 1;
              const nextState = transition({ type: "connection_lost" });
              closeActiveSession();

              if (nextState.status === "reconnecting") {
                void connectWithFreshSecret();
              }
            }
          },
          onHistoryChange(history) {
            if (
              !isMounted.current ||
              connectionAttemptId.current !== attemptId ||
              nextSession === null ||
              activeSession.current !== nextSession
            ) {
              return;
            }

            setTranscript(history);
          },
          onUserSpeechStopped() {
            if (
              !isMounted.current ||
              connectionAttemptId.current !== attemptId ||
              nextSession === null ||
              activeSession.current !== nextSession
            ) {
              return;
            }

            latestUserSpeechStoppedAt.current = now();
          },
          onResponseStart() {
            if (
              !isMounted.current ||
              connectionAttemptId.current !== attemptId ||
              nextSession === null ||
              activeSession.current !== nextSession
            ) {
              return;
            }

            const speechStoppedAt = latestUserSpeechStoppedAt.current;
            latestUserSpeechStoppedAt.current = null;

            if (speechStoppedAt === null) {
              return;
            }

            const elapsed = now() - speechStoppedAt;

            if (Number.isFinite(elapsed) && elapsed >= 0) {
              setResponseStartLatency(Math.round(elapsed));
            }
          },
        },
        clientSecret.model,
      );

      activeSession.current = nextSession;
      await nextSession.connect(clientSecret.clientSecret);
    } catch {
      if (!isMounted.current || connectionAttemptId.current !== attemptId) {
        return;
      }

      const isCurrentAttempt =
        nextSession === null || activeSession.current === nextSession;

      if (!isCurrentAttempt) {
        return;
      }

      if (nextSession !== null) {
        closeActiveSession();
      }

      const nextState = transition({ type: "connection_lost" });

      if (nextState.status === "reconnecting") {
        void connectWithFreshSecret();
      }
    }
  }

  function startConversation(): void {
    transition({ type: "start" });
    statusElement.current?.focus();
    void connectWithFreshSecret();
  }

  return (
    <div className="liveConversationLab">
      <div
        className="presenceStatus"
        role="status"
        aria-live="polite"
        data-status={sessionState.status}
        ref={statusElement}
        tabIndex={-1}
      >
        <span className="statusDot" aria-hidden="true" />
        <p>{statusCopy[sessionState.status]}</p>
      </div>

      <LiveProfileSelector
        profiles={profiles}
        disabled={sessionState.status !== "idle"}
        selectedId={selectedProfileId}
        onSelectedIdChange={setSelectedProfileId}
      />

      <div
        className="conversationTranscript"
        role="log"
        aria-label="Conversation transcript"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {transcript.length === 0 ? (
          <p className="transcriptEmpty">
            Your conversation will appear here for this session only.
          </p>
        ) : (
          transcript.map((item) => (
            <div
              className="transcriptEntry"
              data-role={item.role}
              key={item.id}
            >
              <span>{item.role === "user" ? "You" : "OpenFriend"}</span>
              <p>{item.text}</p>
            </div>
          ))
        )}
      </div>

      <dl className="latencyReadout" aria-label="Live latency">
        <div>
          <dt>Connection</dt>
          <dd aria-label="Connection latency">
            {connectionLatency === null
              ? "Not measured"
              : `${connectionLatency} ms`}
          </dd>
        </div>
        <div>
          <dt>Voice response start</dt>
          <dd aria-label="Voice response start latency">
            {responseStartLatency === null
              ? "Not measured"
              : `${responseStartLatency} ms`}
          </dd>
        </div>
      </dl>

      <div
        className="sessionControls"
        role="group"
        aria-label="Live conversation controls"
      >
        <button
          className="voiceButton"
          type="button"
          disabled={sessionState.status !== "idle"}
          onClick={startConversation}
        >
          <span>Start live conversation</span>
          <small>Microphone access begins here</small>
        </button>
        <button
          className="sessionButton"
          type="button"
          disabled={sessionState.status !== "live"}
          onClick={() => activeSession.current?.interrupt()}
        >
          Interrupt OpenFriend
        </button>
        <button
          className="sessionButton"
          type="button"
          disabled={
            sessionState.status !== "connecting" &&
            sessionState.status !== "live" &&
            sessionState.status !== "reconnecting"
          }
          onClick={endConversation}
        >
          End live conversation
        </button>
        <button
          className="sessionButton"
          type="button"
          disabled={
            sessionState.status !== "ended" && sessionState.status !== "failed"
          }
          onClick={resetConversation}
        >
          Reset voice lab
        </button>
      </div>
    </div>
  );
}
