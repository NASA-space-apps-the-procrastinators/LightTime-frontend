"use client";

import { useAlarm } from "@/hooks/use-alarm";
import { useGroundLink } from "@/hooks/use-ground-link";
import { useMission } from "@/lib/mission-store";

/** Console-wide side effects: the alert beep and the delayed link to the ground. */
export function ConsoleEffects() {
  const { state } = useMission();
  useAlarm(
    state.alerts.some((a) => a.stage === "raised"),
    state.soundOn,
  );
  useGroundLink();
  return null;
}
