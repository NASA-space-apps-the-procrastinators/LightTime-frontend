import { Activity } from "lucide-react";
import { Button } from "@/components/ui/button";

// Placeholder: proves fonts, tokens, shadcn and lucide are wired. Replace with the crew overview.
export default function Home() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-6">
      <h1 className="flex items-center gap-2 font-heading text-3xl font-semibold">
        <Activity aria-hidden className="text-primary" />
        Light Time
      </h1>
      <p className="text-muted-foreground">Setup complete.</p>
      <div className="flex gap-2 text-sm font-medium">
        <span className="rounded-full bg-ok-bg px-3 py-1 text-ok">OK</span>
        <span className="rounded-full bg-watch-bg px-3 py-1 text-watch">
          WATCH
        </span>
        <span className="rounded-full bg-alert-bg px-3 py-1 text-alert">
          ALERT
        </span>
      </div>
      <Button>Acknowledge</Button>
    </main>
  );
}
