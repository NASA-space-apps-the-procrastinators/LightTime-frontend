import { Button } from "@/components/ui/button";

export function CheckinCuff({ onDone }: { onDone: () => void }) {
  return (
    <div className="flex flex-col gap-4">
      <h2 className="font-heading text-lg font-semibold">
        Step 1 · Put on the cuff and sit still
      </h2>
      <p className="text-sm leading-relaxed text-secondary-foreground">
        Fasten the arm cuff over the sleeve and sit still for 2 minutes. Keep
        your arm at heart level. The suit will capture heart rate, blood
        pressure, SpO<sub>2</sub>, temperature and breathing automatically.
      </p>
      <div>
        <Button onClick={onDone} className="min-h-11">
          Cuff is on, start capture
        </Button>
      </div>
    </div>
  );
}
