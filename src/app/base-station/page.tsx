import { AlertsRail } from "@/components/base-station/alerts-rail";
import { CrewBoard } from "@/components/base-station/crew-board";
import { StationStrip } from "@/components/base-station/station-strip";

export default function CrewOverviewPage() {
  return (
    <>
      <StationStrip />
      <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_auto]">
        <CrewBoard />
        <AlertsRail />
      </div>
    </>
  );
}
