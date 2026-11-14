import { AppHeader } from "@/components/base-station/app-header";
import { ConsoleAlarm } from "@/components/base-station/console-alarm";

export default function BaseStationLayout({
  children,
}: LayoutProps<"/base-station">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ConsoleAlarm />
      <AppHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
