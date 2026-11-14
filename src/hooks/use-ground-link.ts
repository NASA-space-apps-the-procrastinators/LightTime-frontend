"use client";

import { useEffect } from "react";
import { useMission } from "@/lib/mission-store";

/** Simulated flight surgeon: replies this long after a bundle is sent. */
export const REPLY_DELAY_MS = 8000;

export function useGroundLink(): void {
  const { state, dispatch } = useMission();
  // "A1@<sentAt>,..." for alerts in flight: the effect re-runs only when this set changes.
  const inFlight = state.alerts
    .filter((a) => a.stage === "sent" && a.sentAt)
    .map((a) => `${a.id}@${a.sentAt}`)
    .join(",");

  useEffect(() => {
    if (!inFlight) return;
    const timers = inFlight.split(",").map((entry) => {
      const [alertId, sentAt] = entry.split("@");
      const parsed = Date.parse(sentAt);
      // A corrupt saved time must not stall the loop: treat it as already due.
      const due = Number.isNaN(parsed) ? Date.now() : parsed + REPLY_DELAY_MS;
      // A reply that came due while the page was closed lands at once.
      return setTimeout(
        () =>
          dispatch({
            type: "receiveReply",
            alertId,
            at: new Date(due).toISOString(),
          }),
        Math.max(0, due - Date.now()),
      );
    });
    return () => timers.forEach(clearTimeout);
  }, [inFlight, dispatch]);
}
