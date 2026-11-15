import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { StatePill } from "@/components/shared/state-pill";
import { TrendChart } from "@/components/shared/trend-chart";
import { regionForMetric } from "@/data/regions";
import { getCrew } from "@/lib/crew";
import { metricLabel, metricUnit } from "@/lib/format";
import { daysOutOfBand, sevenDay } from "@/lib/history";
import type { Alert } from "@/lib/mission-store";
import type { MetricKey } from "@/lib/schemas";
import { bandFor, metricStates, metricValue } from "@/lib/scoring";
import { ruleFor } from "@/lib/thresholds";
import { cn } from "@/lib/utils";

const ORDINAL = ["", "1st", "2nd", "3rd"];
const ALSO: MetricKey[] = ["temp_c", "sleep_h", "spo2", "resp"];

export function AlertSummary({ alert }: { alert: Alert }) {
  const crew = getCrew(alert.crewId);
  if (!crew) return null;
  const m = alert.metric;
  const resolved = alert.stage === "resolved";
  const value = metricValue(m, crew);
  const unit = metricUnit(m);
  const band = bandFor(m, crew.baseline);
  const series = sevenDay(crew, m);
  const days = band ? daysOutOfBand(series, band) : 0;
  const rule = ruleFor(m);
  const states = metricStates(crew);
  const also = ALSO.filter((x) => x !== m && states[x] !== "OK").map(
    (x) =>
      `${metricLabel(x).toLowerCase()} ${metricValue(x, crew)} ${metricUnit(x)}`,
  );
  const headline = `${metricLabel(m)} ${value} ${unit}, ${
    days > 0
      ? `${ORDINAL[days] ?? `${days}th`} day over baseline`
      : "outside baseline"
  }`;

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
          <StatePill state="ALERT" />
        )}
        <h2 className="font-heading text-lg font-semibold">{headline}</h2>
        <Link
          href={`/base-station/crew/${crew.id}?region=${regionForMetric(m)}`}
          className="ml-auto inline-flex items-center gap-1 text-[13px] text-link"
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
            {value} {unit}
          </dd>
        </div>
        <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Baseline (L-60)</dt>
          <dd className="text-lg font-bold">
            {band ? `${band[0]} to ${band[1]} ${unit}` : "No band"}
          </dd>
        </div>
        <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Rule tripped</dt>
          <dd className="text-[13px] font-semibold">{rule.alert}</dd>
        </div>
        <div className="rounded-lg border border-border-soft bg-card px-3 py-2.5">
          <dt className="text-[11px] text-muted-foreground">Also seen</dt>
          <dd className="text-[13px] font-semibold">
            {also.length ? also.join(" · ") : "Nothing else out of band"}
          </dd>
        </div>
      </dl>

      <TrendChart
        series={series}
        band={band}
        unit={unit}
        label={`${metricLabel(m)}, last 7 days`}
      />

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

      <p className="text-xs text-muted-foreground">Source: {rule.source}</p>
    </section>
  );
}
