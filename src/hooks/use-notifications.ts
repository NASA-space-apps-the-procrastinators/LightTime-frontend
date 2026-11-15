"use client";

import { useEffect, useState } from "react";
import { alertHeadline } from "@/lib/alerts";
import { useMission } from "@/lib/mission-store";

/** NotifyButton fires this after the user grants permission. */
export const PERMISSION_EVENT = "light-time:notifications";
// Ids notified and still raised; kept across reloads so a reload does not notify again.
const SHOWN_KEY = "light-time:notified:v1";

function readShown(): Set<string> {
  try {
    const ids: unknown = JSON.parse(localStorage.getItem(SHOWN_KEY) ?? "[]");
    return new Set(Array.isArray(ids) ? ids.map(String) : []);
  } catch {
    return new Set();
  }
}

function writeShown(ids: Set<string>) {
  try {
    localStorage.setItem(SHOWN_KEY, JSON.stringify([...ids]));
  } catch {
    // storage blocked: worst case a reload notifies again
  }
}

/**
 * Registers the service worker, shows one notification per raised alert,
 * closes it once the alert moves on, and acknowledges an alert when the
 * notification's Acknowledge is pressed.
 * shortcut: raised by the open app, not server Web Push; real push needs a backend (VAPID).
 */
export function useNotifications(): void {
  const { state, dispatch, crew } = useMission();
  const [granted, setGranted] = useState(
    () =>
      typeof Notification !== "undefined" &&
      Notification.permission === "granted",
  );

  useEffect(() => {
    const onGrant = () => setGranted(Notification.permission === "granted");
    window.addEventListener(PERMISSION_EVENT, onGrant);
    if (!("serviceWorker" in navigator))
      return () => window.removeEventListener(PERMISSION_EVENT, onGrant);
    const sw = navigator.serviceWorker;
    // Not under `next dev`: a worker there would keep serving this app on localhost after the server stops.
    if (process.env.NODE_ENV === "production")
      sw.register("/sw.js").catch(() => {
        // no worker (http, blocked): the console still works, without install or offline
      });
    const onMessage = (e: MessageEvent) => {
      const d = e.data;
      if (d?.type === "acknowledge" && typeof d.alertId === "string")
        dispatch({
          type: "acknowledge",
          alertId: d.alertId,
          at: new Date().toISOString(),
        });
    };
    sw.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener(PERMISSION_EVENT, onGrant);
      sw.removeEventListener("message", onMessage);
    };
  }, [dispatch]);

  useEffect(() => {
    if (!granted || !("serviceWorker" in navigator)) return;
    const shown = readShown();
    for (const a of state.alerts) {
      const person = crew.find((c) => c.id === a.crewId);
      // A ship alert at WATCH (a LIGHTTIME caution) is silent, like every WATCH.
      if (a.stage !== "raised" || a.live?.state === "WATCH") {
        // Moved on (acknowledged here or elsewhere): its notification's Acknowledge would do nothing.
        if (!shown.delete(a.id)) continue;
        navigator.serviceWorker.ready
          .then((reg) => reg.getNotifications({ tag: a.id }))
          .then((ns) => {
            for (const n of ns) n.close();
          })
          .catch(() => {});
        continue;
      }
      if (!person || shown.has(a.id)) continue;
      shown.add(a.id);
      // Live: the ship's own sentence, which also covers alerts LIGHTTIME raised on its own metrics.
      const what = a.live ? a.live.reason : alertHeadline(person, a.metric);
      navigator.serviceWorker.ready
        .then((reg) =>
          reg.showNotification(
            `Light Time ${a.live?.state === "SOS" ? "SOS" : "ALERT"}`,
            {
              body: `${person.name} · ${what}. Acknowledge to silence the console beep.`,
              tag: a.id,
              data: { alertId: a.id },
              requireInteraction: true,
              // `actions` is in Chrome but not yet in TypeScript's NotificationOptions.
              ...{
                actions: [
                  { action: "ack", title: "Acknowledge" },
                  { action: "open", title: "Open" },
                ],
              },
            },
          ),
        )
        .catch(() => {
          const now = readShown();
          now.delete(a.id);
          writeShown(now);
        });
    }
    writeShown(shown);
  }, [state.alerts, crew, granted]);
}

/**
 * Forget which alerts were notified and close their notifications. Called on restart:
 * the ship numbers alerts from the start again, so an old id would block a new alert.
 */
export function clearNotifications(): void {
  writeShown(new Set());
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator))
    return;
  navigator.serviceWorker.ready
    .then((reg) => reg.getNotifications())
    .then((ns) => {
      for (const n of ns) n.close();
    })
    .catch(() => {});
}
