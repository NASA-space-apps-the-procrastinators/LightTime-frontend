import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Light Time",
    short_name: "Light Time",
    description:
      "Health monitoring for astronauts: body suit, dashboard, flight surgeon.",
    start_url: "/base-station",
    display: "standalone",
    background_color: "#F6F7FB",
    theme_color: "#2563EB",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
