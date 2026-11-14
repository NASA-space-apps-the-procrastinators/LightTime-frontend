"use client";

import { useAlarm } from "@/hooks/use-alarm";
import { useMission } from "@/lib/mission-store";

export function ConsoleAlarm() {
  const { state } = useMission();
  useAlarm(
    state.alerts.some((a) => a.stage === "raised"),
    state.soundOn,
  );
  return null;
}
