import { ImageResponse } from "next/og";

import { profile } from "@/lib/content";
import { mulberry32 } from "@/lib/dots/math";

export const alt = `${profile.name} — ${profile.role}. ${profile.tagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

/** A static echo of the site's particle field: a dust nebula with a red core. */
function field() {
  const rand = mulberry32(42);
  const dots: string[] = [];
  for (let i = 0; i < 2600; i++) {
    const a = rand() * Math.PI * 2;
    const r = Math.sqrt(-2 * Math.log(Math.max(rand(), 1e-6))) * 120;
    const x = 880 + Math.cos(a) * r * 1.5;
    const y = 315 + Math.sin(a) * r * 0.62;
    const near = Math.max(0, 1 - r / 150);
    const color = rand() < near * 0.6 ? "#e2583a" : "#ece8e1";
    const o = (0.18 + rand() * 0.55).toFixed(2);
    dots.push(
      `<rect x="${x.toFixed(1)}" y="${y.toFixed(1)}" width="1.8" height="1.8" fill="${color}" opacity="${o}"/>`,
    );
  }
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630">${dots.join("")}<circle cx="880" cy="315" r="7" fill="#fff4ea"/></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}

const backdrop = field();

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        position: "relative",
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#131312",
        color: "#ece8e1",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders plain img */}
      <img
        src={backdrop}
        width={1200}
        height={630}
        alt=""
        style={{ position: "absolute", inset: 0 }}
      />
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "0 80px",
          width: 900,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 16,
            color: "#8f8b84",
            fontSize: 22,
            letterSpacing: 4,
            textTransform: "uppercase",
          }}
        >
          <div style={{ width: 36, height: 2, background: "#e2583a" }} />
          {profile.role}
        </div>
        <div style={{ fontSize: 104, lineHeight: 1.05, marginTop: 28 }}>
          {profile.name}
        </div>
        <div style={{ fontSize: 30, color: "#b9b4ab", marginTop: 26 }}>
          {profile.tagline}
        </div>
      </div>
    </div>,
    size,
  );
}
