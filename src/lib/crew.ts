import { z } from "zod";
import seed from "@/data/crew-seed.json";
import { type Crew, crewSchema } from "@/lib/schemas";

// Throws at load if the seed drifts from the schema: better than a blank screen later.
export const CREW: Crew[] = z.array(crewSchema).parse(seed.crew);
export const MISSION = seed.mission;
export const STATION = seed.station_today;
export const GROUND = seed.ground;

export function getCrew(id: string): Crew | undefined {
  return CREW.find((c) => c.id === id);
}

// The other three crewmembers checked in before the demo morning starts.
export const SEEDED_CHECKINS = ["C2", "C3", "C4"];
