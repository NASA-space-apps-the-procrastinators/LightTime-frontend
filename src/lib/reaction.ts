// Under 100 ms is a false start; over 3000 ms is a lapse, not a reaction.
const MIN_MS = 100;
const MAX_MS = 3000;

/** Mean reaction time in whole ms, or null with fewer than 3 valid taps. */
export function meanReaction(times: number[]): number | null {
  const valid = times.filter((t) => t >= MIN_MS && t <= MAX_MS);
  if (valid.length < 3) return null;
  return Math.round(valid.reduce((a, b) => a + b, 0) / valid.length);
}
