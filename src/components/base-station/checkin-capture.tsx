import { StatePill } from "@/components/shared/state-pill";
import { Button } from "@/components/ui/button";
import { metricLabel, metricUnit } from "@/lib/format";
import type { Crew, MetricKey } from "@/lib/schemas";
import { bandFor, metricStates, metricValue, worst } from "@/lib/scoring";
import { cn } from "@/lib/utils";

const ROWS: { key: MetricKey | "bp"; label: string }[] = [
  { key: "hr_rest", label: metricLabel("hr_rest") },
  { key: "bp", label: "Blood pressure" },
  { key: "spo2", label: metricLabel("spo2") },
  { key: "temp_c", label: metricLabel("temp_c") },
  { key: "resp", label: metricLabel("resp") },
];

export function CheckinCapture({
  crew,
  onDone,
}: {
  crew: Crew;
  onDone: () => void;
}) {
  const s = metricStates(crew);
  const b = crew.baseline;

  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-semibold">
        Step 2 · Capturing vitals from the suit
      </h2>
      <p className="text-sm text-secondary-foreground">
        Anything outside your baseline band is marked for a second reading.
      </p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {ROWS.map(({ key, label }) => {
          const state = key === "bp" ? worst([s.bp_sys, s.bp_dia]) : s[key];
          const value =
            key === "bp"
              ? `${crew.today.bp[0]}/${crew.today.bp[1]}`
              : String(metricValue(key, crew));
          const unit = key === "bp" ? "mmHg" : metricUnit(key);
          const band =
            key === "bp"
              ? `band ${b.bp[0][0]}–${b.bp[0][1]} / ${b.bp[1][0]}–${b.bp[1][1]}`
              : (() => {
                  const bd = bandFor(key, b);
                  return bd ? `band ${bd[0]}–${bd[1]}` : "";
                })();
          return (
            <div
              key={key}
              data-testid={`capture-${key}`}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5",
                state === "OK"
                  ? "border-border-soft bg-tile"
                  : "border-watch/60 bg-watch-bg/40",
              )}
            >
              <div className="min-w-0 flex-1">
                <div className="text-[11px] text-muted-foreground">{label}</div>
                <div className="text-lg font-bold">
                  {value}{" "}
                  <span className="text-xs font-medium text-muted-foreground">
                    {unit}
                  </span>
                </div>
                <div className="text-[11px] text-muted-foreground">{band}</div>
              </div>
              <StatePill state={state === "OK" ? "OK" : "RECHECK"} />
            </div>
          );
        })}
      </div>
      <p className="text-xs text-muted-foreground">
        Signal quality: ECG good · PPG good · cuff good · packets logged to the
        dashboard as they arrive.
      </p>
      <div>
        <Button onClick={onDone} className="min-h-11">
          Looks right, continue
        </Button>
      </div>
    </div>
  );
}
