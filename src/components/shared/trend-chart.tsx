import type { Band, State } from "@/lib/schemas";

const DAYS = ["-6 d", "-5 d", "-4 d", "-3 d", "-2 d", "-1 d", "Today"];

// x in % and y in px, so the chart stretches to any width without scaling its text.
export function TrendChart({
  series,
  band,
  unit,
  label,
  compact = false,
  outState = "ALERT",
}: {
  series: number[];
  band: Band | null;
  unit: string;
  label: string;
  compact?: boolean;
  /** Colour for out-of-band days: the metric's own state. */
  outState?: Exclude<State, "OK">;
}) {
  const H = compact ? 40 : 180;
  const padY = compact ? 5 : 12;

  const values = band ? [...series, ...band] : series;
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  const span = hi - lo || 2; // a flat series still gets a visible range
  lo -= span * 0.15;
  hi += span * 0.15;

  const x = (i: number) => 3 + (i * 94) / Math.max(1, series.length - 1);
  const y = (v: number) => padY + ((hi - v) * (H - 2 * padY)) / (hi - lo);
  const isOut = (v: number) => band !== null && (v < band[0] || v > band[1]);

  const outCount = series.filter(isOut).length;
  const last = series[series.length - 1];
  const name = [
    `${label}, ${series.length} days, latest ${`${last} ${unit}`.trim()}`,
    band &&
      `${outCount} of ${series.length} days outside baseline ${band[0]} to ${band[1]}`,
  ]
    .filter(Boolean)
    .join(", ");

  const svg = (
    <svg
      role="img"
      aria-label={name}
      width="100%"
      height={H}
      className="block overflow-visible"
    >
      {band && (
        <rect
          x="0"
          width="100%"
          y={y(band[1])}
          height={y(band[0]) - y(band[1])}
          fill="var(--color-ok-bg)"
          stroke="var(--color-ok)"
          strokeOpacity={0.35}
          strokeDasharray="4 3"
        />
      )}
      {series.slice(1).map((v, i) => (
        <line
          // biome-ignore lint/suspicious/noArrayIndexKey: one segment per day, order is fixed
          key={i}
          x1={`${x(i)}%`}
          y1={y(series[i])}
          x2={`${x(i + 1)}%`}
          y2={y(v)}
          stroke="var(--color-foreground)"
          strokeWidth={compact ? 1.5 : 2}
          strokeLinecap="round"
        />
      ))}
      {series.map((v, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: one point per day, order is fixed
          key={i}
          data-out={isOut(v)}
          cx={`${x(i)}%`}
          cy={y(v)}
          r={compact ? 2.5 : 4.5}
          fill={
            band === null
              ? "var(--color-muted-foreground)" // no band, so no in/out to colour
              : isOut(v)
                ? outState === "WATCH"
                  ? "var(--color-watch)"
                  : "var(--color-alert)"
                : "var(--color-ok)"
          }
          stroke="var(--color-card)"
          strokeWidth={compact ? 1 : 2}
        />
      ))}
    </svg>
  );

  if (compact) return svg;

  return (
    <div className="flex gap-2">
      <div
        aria-hidden
        className="relative w-8 shrink-0 text-right text-[11px] text-muted-foreground"
        style={{ height: H }}
      >
        {band && (
          <>
            <span className="absolute right-0" style={{ top: y(band[1]) - 7 }}>
              {band[1]}
            </span>
            <span className="absolute right-0" style={{ top: y(band[0]) - 7 }}>
              {band[0]}
            </span>
          </>
        )}
      </div>
      <div className="min-w-0 flex-1">
        {svg}
        <div
          aria-hidden
          className="relative mt-1 h-4 text-[11px] text-muted-foreground"
        >
          {series.map((_, i) => (
            <span
              // biome-ignore lint/suspicious/noArrayIndexKey: one label per day, order is fixed
              key={i}
              className="absolute -translate-x-1/2 whitespace-nowrap"
              style={{ left: `${x(i)}%` }}
            >
              {DAYS[DAYS.length - series.length + i]}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
