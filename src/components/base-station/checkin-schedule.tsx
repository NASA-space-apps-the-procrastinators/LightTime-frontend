import { Formula } from "@/components/shared/formula";

const SCHEDULE = [
  ["Vitals + mood + sleep", "daily, morning"],
  ["Reaction test", "daily"],
  ["Water and meals", "each meal"],
  ["Fasting glucose", "weekly, Mon"],
  ["Strength test (ARED)", "weekly, Fri"],
  ["Submax cycle (VO2)", "monthly"],
  ["Eye check (SANS)", "periodic"],
  ["Blood and urine panel", "day 160"],
];

export function CheckinSchedule() {
  return (
    <section
      aria-label="Measurement schedule"
      className="flex flex-col gap-2 rounded-xl border border-border bg-card px-4 py-3.5"
    >
      <h2 className="text-[15px] font-semibold">Your measurement schedule</h2>
      {SCHEDULE.map(([what, when]) => (
        <div
          key={what}
          className="flex justify-between gap-3 border-b border-border-soft py-1.5 text-[13px] last:border-0"
        >
          <span>
            <Formula>{what}</Formula>
          </span>
          <span className="text-right text-muted-foreground">{when}</span>
        </div>
      ))}
      <p className="text-[11px] text-muted-foreground">
        Source: schedule mirrors NASA Spaceflight Standard Measures
      </p>
    </section>
  );
}
