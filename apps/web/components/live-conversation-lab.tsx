"use client";

import { useEffect, useReducer, useRef, useState } from "react";

import type {
  LiveModelProfile,
  LiveModelProfileId,
} from "@openfriend/contracts";

import {
  estimateLiveSessionCostUsd,
  LIVE_PRICING_AS_OF,
  medianLatencyMs,
  sumLiveUsage,
  type LiveTokenUsage,
} from "../lib/live-session-evaluation";
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
  connectionTimeoutMs?: number;
  now?: () => number;
}

const DEFAULT_CONNECTION_TIMEOUT_MS = 30_000;

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

type SavedProfileEvaluation = Readonly<{
  profile: LiveModelProfile;
  connectionLatencyMs: number | null;
  medianResponseStartMs: number | null;
  qualityScore: number;
  estimatedCostUsd: number | null;
  usage: LiveTokenUsage;
}>;

const qualityRatings = [
  { value: 1, label: "Poor" },
  { value: 2, label: "Fair" },
  { value: 3, label: "Okay" },
  { value: 4, label: "Good" },
  { value: 5, label: "Excellent" },
] as const;

const usageKeys = [
  "uncachedInputTextTokens",
  "cachedInputTextTokens",
  "uncachedInputAudioTokens",
  "cachedInputAudioTokens",
  "uncachedInputUnknownTokens",
  "cachedInputUnknownTokens",
  "outputTextTokens",
  "outputAudioTokens",
  "outputUnknownTokens",
] as const satisfies readonly (keyof LiveTokenUsage)[];

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
  connectionTimeoutMs = DEFAULT_CONNECTION_TIMEOUT_MS,
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
  const [responseStartSamples, setResponseStartSamples] = useState<
    readonly number[]
  >([]);
  const [usageUpdates, setUsageUpdates] = useState<readonly LiveTokenUsage[]>(
    [],
  );
  const [qualityScore, setQualityScore] = useState<number | null>(null);
  const [hasConnectedInCurrentRun, setHasConnectedInCurrentRun] =
    useState(false);
  const [savedEvaluations, setSavedEvaluations] = useState<
    Partial<Record<LiveModelProfileId, SavedProfileEvaluation>>
  >({});
  const connectionStartedAt = useRef<number | null>(null);
  const latestUserSpeechStoppedAt = useRef<number | null>(null);
  const activeSession = useRef<LiveSession | null>(null);
  const connectionAttemptId = useRef(0);
  const connectionTimeoutId = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const isMounted = useRef(true);
  const statusElement = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    isMounted.current = true;

    return () => {
      isMounted.current = false;
      connectionAttemptId.current += 1;
      clearConnectionTimeout();
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

  function clearConnectionTimeout(): void {
    if (connectionTimeoutId.current === null) {
      return;
    }

    clearTimeout(connectionTimeoutId.current);
    connectionTimeoutId.current = null;
  }

  function transition(event: LiveSessionEvent) {
    const nextState = reduceLiveSessionState(sessionStateRef.current, event);
    sessionStateRef.current = nextState;
    dispatch(event);
    return nextState;
  }

  function endConversation(): void {
    connectionAttemptId.current += 1;
    clearConnectionTimeout();
    closeActiveSession();
    latestUserSpeechStoppedAt.current = null;
    transition({ type: "end" });
    statusElement.current?.focus();
  }

  function resetConversation(): void {
    connectionAttemptId.current += 1;
    clearConnectionTimeout();
    closeActiveSession();
    setTranscript([]);
    setConnectionLatency(null);
    setResponseStartLatency(null);
    setResponseStartSamples([]);
    setUsageUpdates([]);
    setQualityScore(null);
    setHasConnectedInCurrentRun(false);
    connectionStartedAt.current = null;
    latestUserSpeechStoppedAt.current = null;
    if (
      sessionStateRef.current.status === "connecting" ||
      sessionStateRef.current.status === "live" ||
      sessionStateRef.current.status === "reconnecting"
    ) {
      transition({ type: "end" });
    }
    transition({ type: "reset" });
    statusElement.current?.focus();
  }

  function saveEvaluation(): void {
    if (
      sessionStateRef.current.status !== "ended" ||
      !hasConnectedInCurrentRun ||
      qualityScore === null
    ) {
      return;
    }

    const profile = profiles.find(
      (candidate) => candidate.id === selectedProfileId,
    );

    if (!profile) {
      return;
    }

    setSavedEvaluations((evaluations) => ({
      ...evaluations,
      [selectedProfileId]: {
        profile,
        connectionLatencyMs: connectionLatency,
        medianResponseStartMs: medianLatencyMs(responseStartSamples),
        qualityScore,
        estimatedCostUsd: estimateLiveSessionCostUsd(
          selectedProfileId,
          usageUpdates,
        ),
        usage: sumLiveUsage(usageUpdates),
      },
    }));
  }

  function prepareOtherProfile(): void {
    const otherProfileId =
      selectedProfileId === "economy" ? "quality" : "economy";
    resetConversation();
    setSelectedProfileId(otherProfileId);
  }

  function resetComparison(): void {
    setSavedEvaluations({});
    setSelectedProfileId("economy");
    resetConversation();
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
    clearConnectionTimeout();
    connectionTimeoutId.current = setTimeout(() => {
      if (
        !isMounted.current ||
        connectionAttemptId.current !== attemptId ||
        (sessionStateRef.current.status !== "connecting" &&
          sessionStateRef.current.status !== "reconnecting")
      ) {
        return;
      }

      connectionTimeoutId.current = null;
      connectionAttemptId.current += 1;
      closeActiveSession();
      latestUserSpeechStoppedAt.current = null;
      transition({ type: "connection_lost" });
      statusElement.current?.focus();
    }, connectionTimeoutMs);
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
              clearConnectionTimeout();
              setHasConnectedInCurrentRun(true);
              if (connectionStartedAt.current !== null) {
                setConnectionLatency(
                  Math.max(0, Math.round(now() - connectionStartedAt.current)),
                );
              }
              transition({ type: "connected" });
              return;
            }

            if (status === "disconnected") {
              clearConnectionTimeout();
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
              const roundedElapsed = Math.round(elapsed);
              setResponseStartLatency(roundedElapsed);
              setResponseStartSamples((samples) => [
                ...samples,
                roundedElapsed,
              ]);
            }
          },
          onUsageUpdate(usage) {
            if (
              !isMounted.current ||
              connectionAttemptId.current !== attemptId ||
              nextSession === null ||
              activeSession.current !== nextSession
            ) {
              return;
            }

            setUsageUpdates((updates) => [...updates, usage]);
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

      clearConnectionTimeout();
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
    setHasConnectedInCurrentRun(false);
    transition({ type: "start" });
    statusElement.current?.focus();
    void connectWithFreshSecret();
  }

  return (
    <div className="liveConversationLab">
      <section
        className="comparisonGuide"
        aria-labelledby="comparison-guide-heading"
      >
        <p className="eyebrow">Paired experiment</p>
        <h3 id="comparison-guide-heading">
          Use the same guide for both profiles
        </h3>
        <ol>
          <li>I’ve had a long day. Help me reset in one minute.</li>
          <li>
            Help me choose between a quiet evening and seeing friends. Ask me
            one question before advising.
          </li>
          <li>
            While OpenFriend answers, redirect it: Actually, make that
            practical: give me one next step.
          </li>
        </ol>
        <p className="capabilityDisclosure">
          Both profiles support full-duplex audio, interruption, and tool use in
          the current registry. This experiment does not evaluate memory,
          connectors, or Watch behavior.
        </p>
      </section>

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

      {sessionState.status === "ended" &&
      hasConnectedInCurrentRun &&
      savedEvaluations[selectedProfileId] === undefined ? (
        <section
          className="evaluationCapture"
          aria-labelledby="quality-rating-heading"
        >
          <fieldset>
            <legend id="quality-rating-heading">
              Rate this{" "}
              {profiles.find((profile) => profile.id === selectedProfileId)
                ?.displayName ?? selectedProfileId}{" "}
              session
            </legend>
            <div className="qualityRatings">
              {qualityRatings.map((rating) => (
                <label key={rating.value}>
                  <input
                    type="radio"
                    name="quality-rating"
                    value={rating.value}
                    checked={qualityScore === rating.value}
                    onChange={() => setQualityScore(rating.value)}
                  />
                  <span>
                    {rating.value} · {rating.label}
                  </span>
                </label>
              ))}
            </div>
          </fieldset>
          <button
            className="sessionButton"
            type="button"
            disabled={qualityScore === null}
            onClick={saveEvaluation}
          >
            Save{" "}
            {profiles.find((profile) => profile.id === selectedProfileId)
              ?.displayName ?? selectedProfileId}{" "}
            result
          </button>
        </section>
      ) : null}

      {Object.keys(savedEvaluations).length > 0 ? (
        <section
          className="comparisonResults"
          aria-labelledby="comparison-results-heading"
        >
          <div className="comparisonResultsHeader">
            <div>
              <p className="eyebrow">Session-only results</p>
              <h3 id="comparison-results-heading">Profile comparison</h3>
            </div>
            <button
              className="sessionButton"
              type="button"
              onClick={resetComparison}
            >
              Reset comparison
            </button>
          </div>
          <div className="evaluationCards">
            {profiles.map((profile) => {
              const evaluation = savedEvaluations[profile.id];

              if (!evaluation) {
                return null;
              }

              const totalTokens = usageKeys.reduce(
                (total, key) => total + evaluation.usage[key],
                0,
              );

              return (
                <article
                  className="evaluationCard"
                  aria-label={`${profile.displayName} result`}
                  key={profile.id}
                >
                  <h4>{profile.displayName}</h4>
                  <code>{profile.model}</code>
                  <dl>
                    <div>
                      <dt>Connection</dt>
                      <dd>
                        {evaluation.connectionLatencyMs === null
                          ? "Unavailable"
                          : `${evaluation.connectionLatencyMs} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>Median voice response</dt>
                      <dd>
                        {evaluation.medianResponseStartMs === null
                          ? "Unavailable"
                          : `${evaluation.medianResponseStartMs} ms`}
                      </dd>
                    </div>
                    <div>
                      <dt>Quality</dt>
                      <dd>{evaluation.qualityScore} / 5</dd>
                    </div>
                    <div>
                      <dt>Provider usage</dt>
                      <dd>
                        {totalTokens === 0
                          ? "Unavailable"
                          : `${totalTokens.toLocaleString()} tokens`}
                      </dd>
                    </div>
                    <div>
                      <dt>Estimated cost</dt>
                      <dd>
                        {evaluation.estimatedCostUsd === null
                          ? "Unavailable"
                          : `$${evaluation.estimatedCostUsd.toFixed(4)}`}
                      </dd>
                    </div>
                  </dl>
                </article>
              );
            })}
          </div>
          <p className="estimateDisclosure">
            Estimated from provider-reported Realtime usage and published rates
            as of {LIVE_PRICING_AS_OF}. Separate transcription charges, an
            in-flight response ended early, or future charges may be absent.
            Results clear when this page reloads.
          </p>
          {savedEvaluations[selectedProfileId] &&
          Object.keys(savedEvaluations).length < profiles.length ? (
            <button
              className="voiceButton"
              type="button"
              onClick={prepareOtherProfile}
            >
              <span>
                Prepare{" "}
                {selectedProfileId === "economy" ? "Quality" : "Economy"}{" "}
                session
              </span>
              <small>Microphone stays off until Start</small>
            </button>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
