"use client";

import { CrewCard } from "@/components/base-station/crew-card";
import { StatePill } from "@/components/shared/state-pill";
import { useMission } from "@/lib/mission-store";

/** The overview's crew cards: the ship's crew in live mode, the built-in four otherwise. */
export function CrewBoard() {
  const { crew } = useMission();
  return (
    <section aria-label="Crew" className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-baseline gap-3">
        <h1 className="font-heading text-[17px] font-semibold">
          Crew · {crew.length} aboard
        </h1>
        <span className="text-xs text-muted-foreground">
          Scored against each crewmember's own baseline
        </span>
        <span className="ml-auto inline-flex gap-2">
          <StatePill state="OK" />
          <StatePill state="WATCH" />
          <StatePill state="ALERT" label="ALERT · beeps" />
        </span>
      </div>
      <div className="grid gap-3.5 md:grid-cols-2">
        {crew.map((c) => (
          <CrewCard key={c.id} crew={c} />
        ))}
      </div>
    </section>
  );
}
