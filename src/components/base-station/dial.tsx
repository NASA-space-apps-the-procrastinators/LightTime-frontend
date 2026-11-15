"use client";

import { useMission } from "@/lib/mission-store";
import { ship as shipApi, span } from "@/lib/ship-api";
import { cn } from "@/lib/utils";

/** Where the ship is. Moving it changes the light time, who decides and what LIGHTTIME says. */
export function Dial() {
  const { ship, refresh } = useMission();
  if (!ship) return null;
  return (
    <fieldset className="flex shrink-0 items-center gap-1.5 md:flex-wrap md:shrink">
      <legend className="sr-only">Where the ship is</legend>
      {ship.stops.map((s) => {
        const here = s.stop === ship.stop;
        return (
          <button
            key={s.stop}
            type="button"
            aria-pressed={here}
            onClick={() =>
              shipApi
                .post("/api/base/dial", { stop: s.stop })
                .then(refresh, refresh)
            }
            className={cn(
              "min-h-9 whitespace-nowrap rounded-md border px-2.5 py-1 text-[13px]",
              here
                ? "border-primary font-semibold text-foreground"
                : "border-border text-muted-foreground hover:text-foreground",
            )}
          >
            {s.label}
            <span className="ml-1.5 text-[11px] text-muted-foreground">
              {s.link_up ? span(s.delay_s) : "no link"}
            </span>
          </button>
        );
      })}
    </fieldset>
  );
}
