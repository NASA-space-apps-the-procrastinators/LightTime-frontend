import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Light Time — health monitoring for astronauts, over Earth at night";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const asset = async (name: string, type: string) =>
  `data:${type};base64,${(await readFile(join(process.cwd(), "public/images", name))).toString("base64")}`;

export default async function Image() {
  const [earth, logo] = await Promise.all([
    asset("earth-night-csa.jpg", "image/jpeg"),
    asset("logo-dark.png", "image/png"),
  ]);

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        padding: "0 80px",
        backgroundColor: "#070c18",
        backgroundImage: `linear-gradient(90deg, rgba(7,12,24,0.92) 0%, rgba(7,12,24,0.55) 60%, rgba(7,12,24,0.2) 100%), url(${earth})`,
        backgroundSize: "100% 100%, cover",
        color: "#f6f7fb",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain img only */}
      <img src={logo} width={480} height={137} alt="" />
      <div
        style={{ marginTop: 36, fontSize: 40, maxWidth: 760, lineHeight: 1.3 }}
      >
        Health monitoring for astronauts: body suit, dashboard, flight surgeon.
      </div>
    </div>,
    size,
  );
}
