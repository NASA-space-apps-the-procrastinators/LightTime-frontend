import { AppHeader } from "@/components/base-station/app-header";
import { ConsoleEffects } from "@/components/base-station/console-effects";
import { TourBubble } from "@/components/base-station/tour-bubble";
import { MissionProvider } from "@/lib/mission-store";

export default function BaseStationLayout({
  children,
}: LayoutProps<"/base-station">) {
  return (
    <MissionProvider>
      <div className="flex min-h-full flex-1 flex-col">
        <ConsoleEffects />
        <AppHeader />
        <TourBubble />
        {/* Room for the phone tab bar, which is fixed to the bottom. */}
        <main className="flex flex-1 flex-col pb-[calc(4rem+env(safe-area-inset-bottom))] md:pb-0">
          {children}
        </main>
      </div>
    </MissionProvider>
  );
}
