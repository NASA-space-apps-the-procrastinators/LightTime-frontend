import type { Crew, MetricKey, State } from "@/lib/schemas";
import { metricStates, worst } from "@/lib/scoring";

export const REGION_IDS = [
  "head",
  "heart",
  "lungs",
  "gut",
  "spine",
  "legs",
  "skin",
] as const;
export type RegionId = (typeof REGION_IDS)[number];

export type Region = {
  label: string;
  short: string;
  title: string;
  hazard: string;
  metrics: MetricKey[];
  /** Hotspot top-left on the 200 × 560 figure. */
  pos: { x: number; y: number };
  why: string;
  how: string;
  worry: string;
  action: string;
};

// Copy ported from Light Time/design/Astronaut.dc.html.
export const REGIONS: Record<RegionId, Region> = {
  head: {
    label: "Head",
    short: "HEAD",
    title: "Head: vision, sleep and mood",
    hazard: "isolation and confinement, fluid shift",
    metrics: ["sleep_h", "mood", "pvt_ms"],
    pos: { x: 78, y: 20 },
    why: "Sleep loss and low mood are a named NASA risk; short sleep degrades vigilance and judgement within days.",
    how: "Suit actigraphy scores sleep automatically; confirm with the 1-tap morning report and the 3-minute reaction test.",
    worry:
      "Three nights under 6 h, or mood 2 or lower for two days, warrants a conversation with the ground behavioral team.",
    action:
      "Protect tonight’s sleep window, dim lights 1 h before, log caffeine. Eye check due day 165.",
  },
  heart: {
    label: "Heart",
    short: "HRT",
    title: "Heart: heart rate and blood pressure",
    hazard: "altered gravity (cardiovascular deconditioning)",
    metrics: ["hr_rest", "bp_sys", "bp_dia"],
    pos: { x: 78, y: 120 },
    why: "Resting heart rate well above your own baseline for several days points to deconditioning, dehydration, infection or poor sleep, all of which NASA tracks in flight.",
    how: "Suit ECG records continuously; the number shown is the nightly resting average. For BP, use the arm cuff seated and still for 2 minutes.",
    worry:
      "Resting HR more than 20 bpm over baseline for 3 days, any irregular rhythm, or BP outside your pre-flight range on two cuff readings.",
    action:
      "Re-measure BP now, hydrate, log symptoms. This alert has already been raised: acknowledge it and send to the flight surgeon.",
  },
  lungs: {
    label: "Lungs",
    short: "LNG",
    title: "Lungs: breathing and oxygen",
    hazard: "hostile closed environment (CO2, hypoxia)",
    metrics: ["spo2", "resp"],
    pos: { x: 120, y: 170 },
    why: "Cabin CO2 above about 2.8 mmHg brings headaches; above 4.5 mmHg fatigue and nausea. Your breathing rate rises before you notice.",
    how: "Pulse oximeter in the suit cuff; respiratory band on the chest. Cabin values come from station sensors.",
    worry:
      "SpO2 under 94%, breathing rate over 20 at rest, or headache while CO2 is above 2.8 mmHg.",
    action:
      "Nothing now. If headache appears, move to a better-ventilated module and report.",
  },
  gut: {
    label: "Nutrition",
    short: "GUT",
    title: "Nutrition, hydration and glucose",
    hazard: "inadequate nutrition",
    metrics: [],
    pos: { x: 78, y: 240 },
    why: "Under-eating and under-drinking in flight drive muscle and bone loss and raise kidney-stone risk.",
    how: "Fingerstick glucose weekly before breakfast; log meals and water in the app (barcode scan of the food pouch).",
    worry:
      "Fasting glucose outside 70 to 110 mg/dL, intake under 80% of target for a week, or dark urine.",
    action: "Add 400 mL water today; vitamin D dose due tonight.",
  },
  spine: {
    label: "Spine and bone",
    short: "SPN",
    title: "Spine and hip: bone",
    hazard: "altered gravity (bone loss)",
    metrics: [],
    pos: { x: 36, y: 200 },
    why: "NASA’s standard is to keep hip and spine density at or above 95% of pre-mission; loss accelerates past 90 days.",
    how: "No DXA in flight: the estimate combines urine bone markers, calcium, vitamin D and resistance-exercise load.",
    worry:
      "Estimated BMD trending to the 95% floor, or a missed week of resistance exercise.",
    action:
      "Restore 6 ARED sessions a week; confirm vitamin D 25-OH is in the 35 to 90 ng/mL range at the next blood draw.",
  },
  legs: {
    label: "Legs",
    short: "LEG",
    title: "Legs: muscle, strength and fluid",
    hazard: "altered gravity (muscle loss, fluid shift)",
    metrics: [],
    pos: { x: 112, y: 400 },
    why: "NASA requires in-mission strength and aerobic capacity to stay at or above 80% of pre-flight.",
    how: "Weekly leg-press force test on ARED; monthly submaximal cycle test for VO2max; suit IMU logs daily activity.",
    worry:
      "Either measure under 85% (watch) or 80% (alert), or a 20% drop in weekly exercise minutes.",
    action: "Weekly strength test is due Friday.",
  },
  skin: {
    label: "Skin",
    short: "SKN",
    title: "Skin: temperature and radiation dose",
    hazard: "space radiation, immune change",
    metrics: ["temp_c", "dose_mSv_day"],
    pos: { x: 150, y: 110 },
    why: "Radiation has hard mission and career limits; a solar particle event can add a week of dose in hours. A rising temperature with high HR suggests infection.",
    how: "Suit dosimeter samples every 60 s; core temperature from the armpit sensor, confirmed with the ear thermometer.",
    worry:
      "Temperature over 38 °C, or daily dose over 2 mSv, or a SEP shelter advisory.",
    action:
      "SEP event in progress: stay in the shielded module until the advisory clears; re-check temperature in 4 h.",
  },
};

export function regionState(region: RegionId, crew: Crew): State {
  const s = metricStates(crew);
  return worst(REGIONS[region].metrics.map((m) => s[m]));
}

export function regionForMetric(metric: MetricKey): RegionId {
  return REGION_IDS.find((r) => REGIONS[r].metrics.includes(metric)) ?? "heart";
}

/** The region to open first: the crewmember's worst one, heart on a tie. */
export function defaultRegion(crew: Crew): RegionId {
  const rank = { OK: 0, WATCH: 1, ALERT: 2 };
  let best: RegionId = "heart";
  for (const r of REGION_IDS)
    if (rank[regionState(r, crew)] > rank[regionState(best, crew)]) best = r;
  return best;
}

export function isRegionId(v: unknown): v is RegionId {
  return typeof v === "string" && (REGION_IDS as readonly string[]).includes(v);
}
