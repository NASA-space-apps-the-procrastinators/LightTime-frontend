"use client";

import { useAlarm } from "@/hooks/use-alarm";
import { useGroundLink } from "@/hooks/use-ground-link";
import { useNotifications } from "@/hooks/use-notifications";
import { useMission } from "@/lib/mission-store";

/** Console-wide side effects: the alert beep, the delayed link to the ground, and alert notifications. */
export function ConsoleEffects() {
  const { state } = useMission();
  useAlarm(
    state.alerts.some((a) => a.stage === "raised"),
    state.soundOn,
  );
  useGroundLink();
  useNotifications();
  return null;
}
