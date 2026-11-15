"use client";

import { CrewCard } from "@/components/base-station/crew-card";
import { StatePill } from "@/components/shared/state-pill";
import { useFolded } from "@/hooks/use-folded";
import { useMission } from "@/lib/mission-store";

/** The overview's crew cards: the ship's crew in live mode, the built-in four otherwise. */
export function CrewBoard() {
  const { crew } = useMission();
  const [folded, toggle] = useFolded("lighttime.crew.collapsed");
  // Open cards first, folded headers after, so each row holds cards of one height.
  const opened = crew.filter((c) => !folded.includes(c.id));
  const shut = crew.filter((c) => folded.includes(c.id));
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
        {[opened, shut].flatMap((group) =>
          group.map((c, i) => (
            <CrewCard
              key={c.id}
              crew={c}
              folded={group === shut}
              // an odd one out fills its row instead of leaving half of it empty
              wide={group.length % 2 === 1 && i === group.length - 1}
              onToggle={() => toggle(c.id)}
            />
          )),
        )}
      </div>
    </section>
  );
}
