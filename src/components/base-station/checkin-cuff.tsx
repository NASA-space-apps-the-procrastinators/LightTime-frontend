import {
  Activity,
  Gauge,
  HeartPulse,
  Thermometer,
  Timer,
  Wind,
} from "lucide-react";
import Image from "next/image";
import { Button } from "@/components/ui/button";

const CAPTURES = [
  { icon: HeartPulse, label: <>Heart rate</> },
  { icon: Gauge, label: <>Blood pressure</> },
  {
    icon: Activity,
    label: (
      <>
        SpO<sub>2</sub>
      </>
    ),
  },
  { icon: Thermometer, label: <>Temperature</> },
  { icon: Wind, label: <>Breathing</> },
];

export function CheckinCuff({ onDone }: { onDone: () => void }) {
  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-center">
      <div className="flex flex-col gap-5">
        <div className="flex flex-col gap-2">
          <h2 className="font-heading text-xl font-semibold">
            Step 1 · Put on the cuff and sit still
          </h2>
          <p className="text-sm leading-relaxed text-secondary-foreground">
            Fasten the arm cuff over the sleeve and keep your arm at heart
            level. The suit captures everything below by itself.
          </p>
        </div>

        <ul aria-label="The suit captures" className="flex flex-wrap gap-2">
          {CAPTURES.map(({ icon: Icon, label }, i) => (
            <li
              // biome-ignore lint/suspicious/noArrayIndexKey: fixed list
              key={i}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full border border-border bg-tile px-3 text-[13px] font-medium"
            >
              <Icon aria-hidden className="size-4 text-primary" />
              {label}
            </li>
          ))}
        </ul>

        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Timer aria-hidden className="size-4" />
          Sit still for about 2 minutes
        </p>

        <div>
          <Button onClick={onDone} className="min-h-11 px-5">
            Cuff is on, start capture
          </Button>
        </div>
      </div>

      <figure className="overflow-hidden rounded-xl border border-border-soft bg-white">
        <Image
          src="/images/checkin-cuff.jpg"
          alt="An arm in the suit sleeve with the blood-pressure cuff fastened over it, and the wrist unit on its strap reading 84 bpm"
          width={1376}
          height={768}
          sizes="(min-width: 1024px) 55vw, 100vw"
          priority
          className="h-auto w-full"
        />
      </figure>
    </div>
  );
}
