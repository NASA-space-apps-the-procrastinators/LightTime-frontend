"use client";

import { useEffect, useRef } from "react";
import { useAlarm } from "@/hooks/use-alarm";
import { useGroundLink } from "@/hooks/use-ground-link";
import { useMission } from "@/lib/mission-store";

/** Console-wide side effects: the alert beep and the delayed link to the ground. */
export function ConsoleEffects() {
  const { state } = useMission();
  useAlarm(
    state.alerts.some(
      (a) =>
        a.stage === "raised" || (a.live?.state === "SOS" && !a.acknowledgedAt),
    ),
    state.soundOn,
  );
  // LIGHTTIME's sentence, spoken once per alert and level. Browsers allow speech only after a click:
  // the "Sound on" button is that click.
  const said = useRef(new Set<string>());
  useEffect(() => {
    if (!state.soundOn || typeof window.speechSynthesis === "undefined") return;
    for (const alert of state.alerts) {
      const line = alert.live?.speak;
      const key = `${alert.id}:${alert.live?.level}`;
      if (!line || alert.stage === "resolved" || said.current.has(key))
        continue;
      said.current.add(key);
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(line));
    }
  }, [state.alerts, state.soundOn]);
  useGroundLink();
  return null;
}
