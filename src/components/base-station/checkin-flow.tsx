"use client";

import { useState } from "react";
import { CheckinCapture } from "@/components/base-station/checkin-capture";
import { CheckinCuff } from "@/components/base-station/checkin-cuff";
import { CheckinDone } from "@/components/base-station/checkin-done";
import { CheckinMood } from "@/components/base-station/checkin-mood";
import { CheckinSchedule } from "@/components/base-station/checkin-schedule";
import { CheckinStepper } from "@/components/base-station/checkin-stepper";
import { ReactionTest } from "@/components/base-station/reaction-test";
import { MISSION } from "@/lib/crew";
import { useMission } from "@/lib/mission-store";
import type { Checkin } from "@/lib/schemas";

export function CheckinFlow({ crewId }: { crewId: string }) {
  const { state, dispatch, crew: all, ship } = useMission();
  const crew = all.find((c) => c.id === crewId);
  // Already logged today: open on the summary instead of starting over.
  const [step, setStep] = useState(() => (state.checkins[crewId] ? 5 : 1));
  // Seeded from today's record, so going back to Mood or Reaction has the answers.
  const [captured, setCaptured] = useState(() =>
    Boolean(state.checkins[crewId]),
  );
  const [checkin, setCheckin] = useState<Checkin | null>(() => {
    const r = state.checkins[crewId];
    return r
      ? { mood: r.mood, sleep_h: r.sleep_h, symptoms: r.symptoms, note: r.note }
      : null;
  });
  if (!crew) return null;

  return (
    <>
      <section className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border-soft px-4 py-4 md:px-8">
        <h1 className="font-heading text-lg font-bold">
          {crew.name} · Morning check-in · day{" "}
          {ship?.mission_day ?? MISSION.mission_day}
        </h1>
        <CheckinStepper step={step} onSelect={setStep} />
      </section>
      <div className="grid gap-6 px-4 py-6 md:px-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 rounded-xl border border-border bg-card p-5">
          {step === 1 && <CheckinCuff onDone={() => setStep(2)} />}
          {step === 2 && (
            <CheckinCapture
              crew={crew}
              startDone={captured}
              onDone={() => {
                setCaptured(true);
                setStep(3);
              }}
            />
          )}
          {step === 3 && (
            <CheckinMood
              crew={crew}
              initial={checkin}
              onBack={() => setStep(2)}
              onDone={(c) => {
                setCheckin(c);
                setStep(4);
              }}
            />
          )}
          {step === 4 && checkin && (
            <ReactionTest
              baselineMs={crew.baseline.pvt_ms}
              onDone={(ms) => {
                dispatch({
                  type: "completeCheckin",
                  crewId: crew.id,
                  checkin,
                  pvt_ms: ms,
                  at: new Date().toISOString(),
                });
                setStep(5);
              }}
            />
          )}
          {step === 5 && <CheckinDone crew={crew} onRedo={() => setStep(1)} />}
        </section>
        <CheckinSchedule />
      </div>
    </>
  );
}
