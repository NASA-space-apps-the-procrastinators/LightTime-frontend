import type { Gauge } from "@/lib/station";

const R = 38;
const CX = 50;
const CY = 48;

// Fraction 0 sits at the left end of the arc, 1 at the right end.
const point = (f: number, r = R) => {
  const a = Math.PI * (1 - f);
  return [CX + r * Math.cos(a), CY - r * Math.sin(a)] as const;
};
const arc = (f0: number, f1: number) => {
  const [x0, y0] = point(f0);
  const [x1, y1] = point(f1);
  return `M${x0.toFixed(2)} ${y0.toFixed(2)} A${R} ${R} 0 0 1 ${x1.toFixed(2)} ${y1.toFixed(2)}`;
};

/** Half-dial showing where one value sits against its NASA range. */
export function StationGauge({
  label,
  value,
  needleValue,
  unit,
  gauge,
}: {
  label: string;
  value: number;
  /** Where the needle is drawn, if it differs from value while animating; the name always uses value. */
  needleValue?: number;
  unit: string;
  gauge: Gauge;
}) {
  const { min, max, band, marks } = gauge;
  const frac = (v: number) => Math.min(1, Math.max(0, (v - min) / (max - min)));
  const f = frac(needleValue ?? value);
  const where =
    value < band[0] ? "below" : value > band[1] ? "above" : "within";
  const name =
    `${label} ${value} ${unit}, ${where} the NASA range ${band[0]} to ${band[1]} ${unit}`
      .replace(/\s+/g, " ")
      .trim();
  const [nx, ny] = point(f, R - 9);

  return (
    <svg
      role="img"
      aria-label={name}
      viewBox="0 0 100 60"
      className="h-auto w-full"
    >
      <path
        d={arc(0, 1)}
        fill="none"
        stroke="var(--color-border-soft)"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <path
        d={arc(frac(band[0]), frac(band[1]))}
        fill="none"
        stroke="var(--color-ok)"
        strokeOpacity="0.35"
        strokeWidth="8"
      />
      {marks.map((m) => {
        const [x0, y0] = point(frac(m.at), R - 6);
        const [x1, y1] = point(frac(m.at), R + 6);
        return (
          <line
            key={`${m.state}-${m.at}`}
            x1={x0}
            y1={y0}
            x2={x1}
            y2={y1}
            stroke={
              m.state === "ALERT" ? "var(--color-alert)" : "var(--color-watch)"
            }
            strokeWidth="2"
          />
        );
      })}
      <line
        data-testid="needle"
        data-fraction={String(Math.round(f * 1000) / 1000)}
        x1={CX}
        y1={CY}
        x2={nx}
        y2={ny}
        stroke="var(--color-foreground)"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
      <circle cx={CX} cy={CY} r="3.5" fill="var(--color-foreground)" />
    </svg>
  );
}
