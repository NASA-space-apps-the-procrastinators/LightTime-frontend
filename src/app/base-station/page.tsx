import { AlertsRail } from "@/components/base-station/alerts-rail";
import { CrewCard } from "@/components/base-station/crew-card";
import { StationStrip } from "@/components/base-station/station-strip";
import { StatePill } from "@/components/shared/state-pill";
import { CREW } from "@/lib/crew";

export default function CrewOverviewPage() {
  return (
    <>
      <StationStrip />
      <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_340px]">
        <section aria-label="Crew" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-baseline gap-3">
            <h1 className="font-heading text-[17px] font-semibold">
              Crew · {CREW.length} aboard
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
            {CREW.map((c) => (
              <CrewCard key={c.id} crew={c} />
            ))}
          </div>
        </section>
        <AlertsRail />
      </div>
    </>
  );
}
