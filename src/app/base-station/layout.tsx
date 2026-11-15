import { AppHeader } from "@/components/base-station/app-header";
import { ConsoleEffects } from "@/components/base-station/console-effects";

export default function BaseStationLayout({
  children,
}: LayoutProps<"/base-station">) {
  return (
    <div className="flex min-h-full flex-1 flex-col">
      <ConsoleEffects />
      <AppHeader />
      <main className="flex flex-1 flex-col">{children}</main>
    </div>
  );
}
