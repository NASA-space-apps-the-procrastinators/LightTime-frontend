import type { Metadata, Viewport } from "next";
import { Manrope, Space_Grotesk } from "next/font/google";
import { TourProvider } from "@/components/shared/tour";
import { THEME_SCRIPT } from "@/lib/theme";
import "./globals.css";

const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"] });

const spaceGrotesk = Space_Grotesk({
  variable: "--font-space-grotesk",
  subsets: ["latin"],
});

const description =
  "Health monitoring for astronauts: body suit, dashboard, flight surgeon.";

export const metadata: Metadata = {
  // Share previews need absolute image URLs; same domain the Dockerfile builds against.
  metadataBase: new URL("https://lighttime.health"),
  title: "Light Time",
  description,
  openGraph: {
    type: "website",
    siteName: "Light Time",
    title: "Light Time",
    description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Light Time",
    description,
  },
};

// cover: lets the phone tab bar pad itself clear of the home indicator.
export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fb" },
    { media: "(prefers-color-scheme: dark)", color: "#070c18" },
  ],
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${manrope.variable} ${spaceGrotesk.variable} h-full antialiased`}
      // The head script may add "dark" before React loads; that difference is expected.
      suppressHydrationWarning
    >
      <head>
        <script
          // biome-ignore lint/security/noDangerouslySetInnerHtml: a fixed string from this repo, run before paint to pick the theme
          dangerouslySetInnerHTML={{ __html: THEME_SCRIPT }}
        />
      </head>
      <body className="min-h-full flex flex-col">
        <TourProvider>{children}</TourProvider>
      </body>
    </html>
  );
}
