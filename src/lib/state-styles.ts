import type { State } from "@/lib/schemas";

/** Border tint for a card or tile in a given state. Green, yellow, red are for state only. */
export const STATE_BORDER: Record<State, string> = {
  OK: "border-ok/55",
  WATCH: "border-watch/60",
  ALERT: "border-alert",
};

export const STATE_BAR: Record<State, string> = {
  OK: "bg-ok",
  WATCH: "bg-watch",
  ALERT: "bg-alert",
};

export const TILE_TINT: Record<State, string> = {
  OK: "border-border-soft bg-tile",
  WATCH: "border-watch/60 bg-watch-bg/40",
  ALERT: "border-alert/60 bg-alert-bg/50",
};
