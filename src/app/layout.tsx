import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { MissionProvider } from "@/lib/mission-store";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Light Time",
  description:
    "Health monitoring for astronauts: body suit, dashboard, flight surgeon.",
};

// cover: lets the phone tab bar pad itself clear of the home indicator.
export const viewport: Viewport = {
  themeColor: "#2563EB",
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MissionProvider>{children}</MissionProvider>
      </body>
    </html>
  );
}
