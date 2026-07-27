import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import { listLiveModelProfiles } from "@openfriend/contracts";

import {
  LiveConversationLab,
  type LiveSessionFactory,
} from "../../components/live-conversation-lab";
import type { LiveSession } from "../../lib/live-session";
import { createMockLiveSession } from "./mock-live-session";

type EventCounts = Record<string, number>;
type Diagnostics = Readonly<{
  clientSecrets: readonly string[];
  factoryModels: readonly string[];
}>;

let clock = 1_000;
const trackedSessions = new Set<LiveSession>();

function HarnessPage() {
  const [eventCounts, setEventCounts] = useState<EventCounts>({});
  const [diagnostics, setDiagnostics] = useState<Diagnostics>({
    clientSecrets: [],
    factoryModels: [],
  });
  const failConnect =
    new URLSearchParams(window.location.search).get("scenario") === "failure";
  const recordEvent = useCallback((event: string) => {
    setEventCounts((current) => ({
      ...current,
      [event]: (current[event] ?? 0) + 1,
    }));
  }, []);
  const createSession: LiveSessionFactory = useCallback(
    (callbacks, model) => {
      setDiagnostics((current) => ({
        ...current,
        factoryModels: [...current.factoryModels, model],
      }));

      const session = createMockLiveSession(callbacks, {
        advanceClock(milliseconds) {
          clock += milliseconds;
        },
        failConnect,
        onConnect(clientSecret) {
          setDiagnostics((current) => ({
            ...current,
            clientSecrets: [...current.clientSecrets, clientSecret],
          }));
        },
        onEvent: recordEvent,
      });
      trackedSessions.add(session);
      return session;
    },
    [failConnect, recordEvent],
  );

  return (
    <>
      <LiveConversationLab
        profiles={listLiveModelProfiles()}
        createSession={createSession}
        now={() => clock}
      />
      <output data-testid="harness-events">
        {Object.entries(eventCounts)
          .sort(([left], [right]) => left.localeCompare(right))
          .map(([event, count]) => `${event}:${count}`)
          .join(" ")}
      </output>
      <output data-testid="harness-diagnostics">
        {[...diagnostics.factoryModels]
          .map((model) => `factory-model:${model}`)
          .concat(
            diagnostics.clientSecrets.map(
              (clientSecret) => `connect-secret:${clientSecret}`,
            ),
          )
          .join(" ")}
      </output>
    </>
  );
}

const container = document.querySelector("#harness-root");

if (!(container instanceof HTMLElement)) {
  throw new Error("Browser harness root is missing");
}

const root = createRoot(container);
let unmounted = false;

function closeTrackedSessions(): number {
  const sessions = [...trackedSessions];
  trackedSessions.clear();

  for (const session of sessions) {
    session.close();
  }

  return sessions.length;
}

root.render(<HarnessPage />);
window.__openfriendBrowserHarness = {
  attemptExternalWebSocket() {
    return new Promise((resolve) => {
      const socket = new WebSocket("wss://external.openfriend.invalid/socket");
      socket.addEventListener(
        "close",
        (event) => {
          resolve({ code: event.code, reason: event.reason });
        },
        { once: true },
      );
    });
  },
  unmount() {
    if (unmounted) {
      return 0;
    }

    unmounted = true;
    let trackedSessionCount = 0;
    try {
      root.unmount();
    } finally {
      trackedSessionCount = closeTrackedSessions();
    }
    return trackedSessionCount;
  },
};

declare global {
  interface Window {
    __openfriendBrowserHarness?: {
      attemptExternalWebSocket(): Promise<{
        code: number;
        reason: string;
      }>;
      unmount(): number;
    };
  }
}
