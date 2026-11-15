"use client";

import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { BodyMap } from "@/components/base-station/body-map";
import { MetricTiles } from "@/components/base-station/metric-tiles";
import { RegionCards } from "@/components/base-station/region-cards";
import { Formula } from "@/components/shared/formula";
import { SimulatedTag } from "@/components/shared/simulated-tag";
import { StatePill } from "@/components/shared/state-pill";
import { TrendChart } from "@/components/shared/trend-chart";
import { buttonVariants } from "@/components/ui/button";
import {
  defaultRegion,
  isRegionId,
  REGIONS,
  type RegionId,
  regionState,
} from "@/data/regions";
import { MISSION } from "@/lib/crew";
import { metricLabel, metricUnit } from "@/lib/format";
import { sevenDay } from "@/lib/history";
import { useMission } from "@/lib/mission-store";
import type { MetricKey } from "@/lib/schemas";
import { bandFor, crewState, metricStates } from "@/lib/scoring";
import { cn } from "@/lib/utils";

export function AstronautDetail({ crewId }: { crewId: string }) {
  const { state, crew: all, ship } = useMission();
  const crew = all.find((c) => c.id === crewId);
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [picked, setPicked] = useState<MetricKey | null>(null);
  if (!crew) return null;

  const fromUrl = params.get("region");
  const region: RegionId = isRegionId(fromUrl) ? fromUrl : defaultRegion(crew);
  const r = REGIONS[region];
  // The chart follows the tile you picked, or the region's first metric.
  const chartMetric =
    picked && r.metrics.includes(picked) ? picked : (r.metrics[0] ?? null);
  const openAlert = state.alerts.find(
    (a) => a.crewId === crew.id && a.stage !== "resolved",
  );
  const select = (next: RegionId) =>
    router.replace(`${pathname}?region=${next}`, { scroll: false });

  return (
    <>
      <section className="flex flex-wrap items-center gap-4 border-b border-border-soft px-4 py-4 md:px-8">
        <Link
          href="/base-station"
          className="inline-flex min-h-11 items-center gap-1 text-[13px] text-link"
        >
          <ArrowLeft aria-hidden className="size-4" /> Crew
        </Link>
        <div
          aria-hidden
          className="flex size-12 items-center justify-center rounded-full bg-border-soft font-bold text-link"
        >
          {crew.name[0]}
        </div>
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="font-heading text-xl font-bold">{crew.name}</h1>
            <StatePill state={crewState(crew)} />
          </div>
          <p className="text-xs text-muted-foreground">
            {crew.role} · suit {crew.suit_id} · baseline set L-60 ·{" "}
            {ship?.mission_day ?? MISSION.mission_day} days in flight
          </p>
        </div>
        {openAlert && (
          <Link
            href={`/base-station/alerts/${openAlert.id}`}
            className={cn(buttonVariants(), "ml-auto min-h-11")}
          >
            Open alert
          </Link>
        )}
      </section>

      <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section
          aria-label="Body map"
          className="flex flex-col gap-2.5 rounded-xl border border-border bg-card p-4"
        >
          <div className="flex items-baseline">
            <h2 className="text-[15px] font-semibold">Body map</h2>
            <span className="ml-auto text-[11px] text-muted-foreground">
              tap a region
            </span>
          </div>
          <BodyMap crew={crew} selected={region} onSelect={select} />
          <div className="flex flex-wrap gap-2">
            <StatePill state="OK" />
            <StatePill state="WATCH" />
            <StatePill state="ALERT" />
          </div>
          <p className="text-[11px] leading-relaxed text-muted-foreground">
            HEAD vision, sleep, mood · HRT heart, BP · LNG breathing, SpO
            <sub>2</sub> · GUT nutrition, glucose · SPN bone · LEG muscle, fluid
            · SKN temperature, dose. Ring colour is the region's state.
          </p>
        </section>

        <section
          aria-label="Indicator detail"
          className="flex min-w-0 flex-col gap-4"
        >
          <div className="flex flex-wrap items-center gap-3">
            <h2 className="text-[17px] font-semibold">{r.title}</h2>
            <StatePill state={regionState(region, crew)} />
            <span className="text-xs text-muted-foreground">
              Hazard: <Formula>{r.hazard}</Formula>
            </span>
          </div>
          <MetricTiles
            crew={crew}
            region={region}
            active={chartMetric}
            onPick={setPicked}
          />
          {chartMetric && (
            <div className="rounded-xl border border-border bg-card px-4 py-3.5">
              <div className="mb-2 flex flex-wrap items-center gap-2">
                <h3 className="text-sm font-semibold">
                  <Formula>{`${metricLabel(chartMetric)}, last 7 days`}</Formula>
                </h3>
                <span className="text-xs text-muted-foreground">
                  green band = {crew.name}'s own baseline
                </span>
                <SimulatedTag className="ml-auto" />
              </div>
              <TrendChart
                series={sevenDay(crew, chartMetric)}
                band={bandFor(chartMetric, crew.baseline)}
                unit={metricUnit(chartMetric)}
                label={metricLabel(chartMetric)}
                outState={
                  metricStates(crew)[chartMetric] === "WATCH"
                    ? "WATCH"
                    : "ALERT"
                }
              />
            </div>
          )}
          <RegionCards region={region} state={regionState(region, crew)} />
        </section>
      </div>
    </>
  );
}
