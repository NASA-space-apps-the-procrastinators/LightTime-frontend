import { API_URL, LIVE } from "@/lib/ship-api";

export type StatKind = "pageview" | "click";

// The ship takes at most 20 events a request.
const BATCH = 20;
let queue: { kind: StatKind; name: string }[] = [];
let started = false;

/** Counts one page view or click for the ship's traffic stats. Sent in batches; nothing in seed mode. */
export function report(kind: StatKind, name: string): void {
  if (!LIVE || !name) return;
  queue.push({ kind, name });
  if (started) return;
  started = true;
  setInterval(send, 5000);
  addEventListener("pagehide", send);
}

function send(): void {
  while (queue.length > 0) {
    const events = queue.slice(0, BATCH);
    queue = queue.slice(BATCH);
    // text/plain needs no CORS preflight; the ship reads the body as JSON whatever its type.
    navigator.sendBeacon(
      `${API_URL}/api/stats/events`,
      new Blob([JSON.stringify({ events })], {
        type: "text/plain;charset=UTF-8",
      }),
    );
  }
}

/** A button's or link's name: its data-stat, else its aria-label, else its text cut to 40 characters. */
export function statName(el: Element): string {
  return (
    el.getAttribute("data-stat") ||
    el.getAttribute("aria-label") ||
    (el.textContent ?? "").trim().slice(0, 40)
  );
}

/** The name of the button or link a click landed in, or null when it landed in neither. */
export function clickName(target: EventTarget | null): string | null {
  const el = target instanceof Element ? target.closest("button, a") : null;
  return el ? statName(el) : null;
}

/** Every crew member's page counts as one page. */
export function statPath(path: string): string {
  return path.replace(/\/crew\/[^/]+/, "/crew/[id]");
}
