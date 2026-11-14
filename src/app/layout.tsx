import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import { MissionProvider } from "@/lib/mission-store";
import "./globals.css";

const inter = Inter({ variable: "--font-inter", subsets: ["latin"] });

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Light Time",
  description:
    "Health monitoring for astronauts: body suit, dashboard, flight surgeon.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <MissionProvider>{children}</MissionProvider>
      </body>
    </html>
  );
}
