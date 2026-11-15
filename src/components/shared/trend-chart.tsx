import type { Band, State } from "@/lib/schemas";

const DAYS = ["-6 d", "-5 d", "-4 d", "-3 d", "-2 d", "-1 d", "Today"];

const r2 = (v: number) => Number(v.toFixed(2));

/** One smooth path through the points (monotone cubic: never bulges past a reading). */
export function smoothPath(p: [number, number][]): string {
  const n = p.length;
  if (n === 0) return "";
  let d = `M${r2(p[0][0])},${r2(p[0][1])}`;
  if (n === 1) return d;
  const slope = p.slice(1).map((q, i) => (q[1] - p[i][1]) / (q[0] - p[i][0]));
  // Harmonic mean of the neighbouring slopes, flat at peaks and troughs (Fritsch-Carlson).
  const m = p.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    const [a, b] = [slope[i - 1], slope[i]];
    return a * b <= 0 ? 0 : (2 * a * b) / (a + b);
  });
  for (let i = 0; i < n - 1; i++) {
    const h = (p[i + 1][0] - p[i][0]) / 3;
    d += ` C${r2(p[i][0] + h)},${r2(p[i][1] + m[i] * h)} ${r2(p[i + 1][0] - h)},${r2(p[i + 1][1] - m[i + 1] * h)} ${r2(p[i + 1][0])},${r2(p[i + 1][1])}`;
  }
  return d;
}

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
      {/* x is in %, so the line is drawn in a 100-wide box stretched to fit; the stroke keeps its width. */}
      <svg
        aria-hidden="true"
        width="100%"
        height={H}
        viewBox={`0 0 100 ${H}`}
        preserveAspectRatio="none"
        className="overflow-visible"
      >
        <path
          data-line
          d={smoothPath(series.map((v, i) => [x(i), y(v)]))}
          fill="none"
          stroke="var(--color-foreground)"
          strokeWidth={compact ? 1.5 : 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
      </svg>
      {series.map((v, i) => (
        <circle
          // biome-ignore lint/suspicious/noArrayIndexKey: one point per day, order is fixed
          key={i}
          data-out={isOut(v)}
          cx={`${x(i)}%`}
          cy={y(v)}
          r={compact ? 2 : 4}
          fill={
            band === null
              ? "var(--color-muted-foreground)" // no band, so no in/out to colour
              : isOut(v)
                ? outState === "WATCH"
                  ? "var(--color-watch)"
                  : "var(--color-alert)"
                : "var(--color-ok)"
          }
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
