"use client";

import { useEffect, useRef } from "react";

const BEEP_INTERVAL_MS = 2500;
const BEEP_HZ = 880;
const BEEP_S = 0.15;

/** Console beep: 880 Hz every 2.5 s while an ALERT is unacknowledged and sound is on. */
export function useAlarm(active: boolean, soundOn: boolean): void {
  const ctx = useRef<AudioContext | null>(null);

  useEffect(() => {
    if (!active || !soundOn) return;

    const beep = () => {
      // A background tab stays quiet; the system notification covers it.
      if (document.hidden) return;
      try {
        const Ctor = globalThis.AudioContext;
        if (!Ctor) return;
        ctx.current ??= new Ctor();
        const audio = ctx.current;
        // Browsers suspend audio until a click; skip rather than queue beeps for later.
        if (audio.state !== "running") {
          void audio.resume();
          return;
        }
        const osc = audio.createOscillator();
        const gain = audio.createGain();
        osc.type = "sine";
        osc.frequency.value = BEEP_HZ;
        gain.gain.setValueAtTime(0.2, audio.currentTime);
        gain.gain.exponentialRampToValueAtTime(
          0.001,
          audio.currentTime + BEEP_S,
        );
        osc.connect(gain);
        gain.connect(audio.destination);
        osc.start();
        osc.stop(audio.currentTime + BEEP_S);
      } catch {
        // No audio available: the red pulse still carries the alert.
      }
    };

    beep();
    const id = setInterval(beep, BEEP_INTERVAL_MS);
    return () => clearInterval(id);
  }, [active, soundOn]);
}
