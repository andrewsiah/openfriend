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
import type {
  LiveHistoryItem,
  LiveSession,
  LiveSessionCallbacks,
} from "../lib/live-session";
import { OpenAILiveSession } from "../lib/openai-live-session";
import { LiveProfileSelector } from "./live-profile-selector";

export type LiveSessionFactory = (
  callbacks: LiveSessionCallbacks,
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

function getClientSecret(value: unknown): string {
  if (
    typeof value !== "object" ||
    value === null ||
    typeof (value as Record<string, unknown>).clientSecret !== "string" ||
    !(value as { clientSecret: string }).clientSecret.startsWith("ek_")
  ) {
    throw new Error("Invalid client secret response");
  }

  return (value as { clientSecret: string }).clientSecret;
}

function createOpenAILiveSession(callbacks: LiveSessionCallbacks): LiveSession {
  return new OpenAILiveSession({
    agent: {
      name: "OpenFriend",
      instructions: "Be a warm, thoughtful conversational companion.",
    },
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
  const latestCompletedUserId = useRef<string | null>(null);
  const latestCompletedUserAt = useRef<number | null>(null);
  const activeSession = useRef<LiveSession | null>(null);
  const isMounted = useRef(true);
  const statusElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
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
    closeActiveSession();
    transition({ type: "end" });
    statusElement.current?.focus();
  }

  async function requestClientSecret(): Promise<string> {
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
    connectionStartedAt.current = now();
    let nextSession: LiveSession | null = null;

    try {
      const clientSecret = await requestClientSecret();

      if (!isMounted.current) {
        return;
      }

      nextSession = createSession({
        onConnectionChange(status) {
          if (
            !isMounted.current ||
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
            nextSession === null ||
            activeSession.current !== nextSession
          ) {
            return;
          }

          setTranscript(history);
          let latestCompletedUser: LiveHistoryItem | undefined;

          for (let index = history.length - 1; index >= 0; index -= 1) {
            const item = history[index];

            if (item?.role === "user" && item.status === "completed") {
              latestCompletedUser = item;
              break;
            }
          }

          if (
            latestCompletedUser &&
            latestCompletedUser.id !== latestCompletedUserId.current
          ) {
            latestCompletedUserId.current = latestCompletedUser.id;
            latestCompletedUserAt.current = now();
          }
        },
        onResponseStart() {
          if (
            !isMounted.current ||
            nextSession === null ||
            activeSession.current !== nextSession
          ) {
            return;
          }

          if (latestCompletedUserAt.current !== null) {
            setResponseStartLatency(
              Math.max(0, Math.round(now() - latestCompletedUserAt.current)),
            );
          }
        },
      });

      activeSession.current = nextSession;
      await nextSession.connect(clientSecret);
    } catch {
      const isCurrentAttempt =
        nextSession === null || activeSession.current === nextSession;

      if (!isCurrentAttempt) {
        return;
      }

      if (nextSession !== null) {
        closeActiveSession();
      }

      if (isMounted.current) {
        transition({ type: "connection_lost" });
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
          <dd>
            {connectionLatency === null
              ? "Not measured"
              : `${connectionLatency} ms`}
          </dd>
        </div>
        <div>
          <dt>Response start</dt>
          <dd>
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
          disabled={sessionState.status !== "live"}
          onClick={endConversation}
        >
          End live conversation
        </button>
      </div>
    </div>
  );
}
