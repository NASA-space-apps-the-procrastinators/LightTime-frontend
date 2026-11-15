"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { Formula } from "@/components/shared/formula";
import { StatePill } from "@/components/shared/state-pill";
import { TrendChart } from "@/components/shared/trend-chart";
import { regionForMetric } from "@/data/regions";
import { alertHeadline } from "@/lib/alerts";
import { inSentence, metricLabel, metricUnit } from "@/lib/format";
import { sevenDay } from "@/lib/history";
import { type Alert, useMission } from "@/lib/mission-store";
import type { MetricKey } from "@/lib/schemas";
import { bandFor, metricStates, metricValue } from "@/lib/scoring";
import { ruleFor } from "@/lib/thresholds";
import { cn } from "@/lib/utils";

const ALSO: MetricKey[] = ["temp_c", "sleep_h", "spo2", "resp"];

export function AlertSummary({ alert }: { alert: Alert }) {
  const crew = useMission().crew.find((c) => c.id === alert.crewId);
  if (!crew) return null;
  const m = alert.metric;
  const resolved = alert.stage === "resolved";
  const value = metricValue(m, crew);
  const unit = metricUnit(m);
  const band = bandFor(m, crew.baseline);
  const series = sevenDay(crew, m);
  const rule = ruleFor(m);
  const live = alert.live;
  const fromShipAi = live?.raised_by === "lighttime";
  const states = metricStates(crew);
  const also = ALSO.filter((x) => x !== m && states[x] !== "OK").map(
    (x) => `${inSentence(x)} ${metricValue(x, crew)} ${metricUnit(x)}`,
  );
  const headline = alertHeadline(crew, m);

  return (
    <section
      aria-label="Alert"
      className={cn(
        "flex flex-col gap-4 rounded-xl border px-5 py-4",
        resolved ? "border-border bg-card" : "border-alert bg-alert-bg/30",
      )}
    >
      <div className="flex flex-wrap items-center gap-3">
        {resolved ? (
          <StatePill state="OK" label="RESOLVED" />
        ) : (
          <StatePill
            state={live?.state === "WATCH" ? "WATCH" : "ALERT"}
            label={live?.state === "SOS" ? "SOS" : undefined}
          />
        )}
        <h2 className="font-heading text-lg font-semibold">
          <Formula>{live ? live.reason : headline}</Formula>
        </h2>
        <Link
          href={`/base-station/crew/${crew.id}?region=${regionForMetric(m)}`}
          className="ml-auto inline-flex min-h-11 items-center gap-1 text-[13px] text-link"
        >
          Open body map <ArrowRight aria-hidden className="size-4" />
        </Link>
      </div>
      <p className="-mt-2 text-xs text-muted-foreground">
        {crew.name} · {crew.role}
      </p>

      <dl className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Current</dt>
          <dd className="text-2xl font-bold text-alert">
            {live?.value ?? value} {live?.unit ?? unit}
          </dd>
        </div>
        {!fromShipAi && (
          <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">
              Baseline (L-60)
            </dt>
            <dd className="text-lg font-bold">
              {band ? `${band[0]} to ${band[1]} ${unit}` : "No band"}
            </dd>
          </div>
        )}
        <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Rule tripped</dt>
          <dd className="text-[13px] font-semibold">
            <Formula>{live?.rule ?? rule.alert}</Formula>
          </dd>
        </div>
        {!fromShipAi && (
          <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
            <dt className="text-[11px] text-muted-foreground">Also seen</dt>
            <dd className="text-[13px] font-semibold">
              <Formula>
                {also.length ? also.join(" · ") : "Nothing else out of band"}
              </Formula>
            </dd>
          </div>
        )}
      </dl>

      {!fromShipAi && (
        <TrendChart
          series={series}
          band={band}
          unit={unit}
          label={`${metricLabel(m)}, last 7 days`}
        />
      )}

      {alert.symptoms.length > 0 && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-muted-foreground">Symptoms attached:</span>
          {alert.symptoms.map((s) => (
            <span
              key={s}
              className="rounded-full border border-border-strong bg-card px-2.5 py-1 font-semibold"
            >
              {s}
            </span>
          ))}
        </div>
      )}

      <p className="text-xs text-muted-foreground">
        Source: {live?.source ?? rule.source}
      </p>
    </section>
  );
}
