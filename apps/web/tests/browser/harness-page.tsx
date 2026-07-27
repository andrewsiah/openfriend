import { useCallback, useState } from "react";
import { createRoot } from "react-dom/client";

import { listLiveModelProfiles } from "@openfriend/contracts";

import {
  LiveConversationLab,
  type LiveSessionFactory,
} from "../../components/live-conversation-lab";
import { createMockLiveSession } from "./mock-live-session";

type EventCounts = Record<string, number>;

let clock = 1_000;

function HarnessPage() {
  const [eventCounts, setEventCounts] = useState<EventCounts>({});
  const failConnect =
    new URLSearchParams(window.location.search).get("scenario") === "failure";
  const recordEvent = useCallback((event: string) => {
    setEventCounts((current) => ({
      ...current,
      [event]: (current[event] ?? 0) + 1,
    }));
  }, []);
  const createSession: LiveSessionFactory = useCallback(
    (callbacks) =>
      createMockLiveSession(callbacks, {
        advanceClock(milliseconds) {
          clock += milliseconds;
        },
        failConnect,
        onEvent: recordEvent,
      }),
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
    </>
  );
}

const container = document.querySelector("#harness-root");

if (!(container instanceof HTMLElement)) {
  throw new Error("Browser harness root is missing");
}

const root = createRoot(container);
let unmounted = false;

root.render(<HarnessPage />);
window.__openfriendBrowserHarness = {
  unmount() {
    if (unmounted) {
      return;
    }

    unmounted = true;
    root.unmount();
  },
};

declare global {
  interface Window {
    __openfriendBrowserHarness?: {
      unmount(): void;
    };
  }
}
