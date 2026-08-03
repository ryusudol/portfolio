import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt =
  "Suhyeon Yu, software engineer and Software Engineering Intern at ABC Fitness";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const portrait = await readFile(
  join(process.cwd(), "public/images/portrait/suhyeon-mountain-profile.png"),
);
const portraitData = `data:image/png;base64,${portrait.toString("base64")}`;

export default function OpenGraphImage() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#f9fafc",
        color: "#292724",
        padding: "72px 80px",
        fontFamily: "sans-serif",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "730px",
        }}
      >
        <span
          style={{
            display: "flex",
            color: "#78736d",
            fontSize: 26,
            letterSpacing: "0.08em",
            marginBottom: 34,
          }}
        >
          SOFTWARE ENGINEER
        </span>
        <span
          style={{
            display: "flex",
            fontSize: 86,
            fontWeight: 700,
            letterSpacing: "-0.05em",
            lineHeight: 1,
          }}
        >
          Suhyeon Yu
        </span>
        <span
          style={{
            display: "flex",
            color: "#655f59",
            fontSize: 34,
            lineHeight: 1.35,
            marginTop: 30,
          }}
        >
          Crafting web experiences for both humans and agents.
        </span>
        <span
          style={{
            display: "flex",
            width: 180,
            borderTop: "4px solid #e0dcd6",
            marginTop: 50,
          }}
        />
      </div>

      <div
        style={{
          display: "flex",
          width: 270,
          height: 350,
          borderRadius: 52,
          overflow: "hidden",
          border: "8px solid #ffffff",
          boxShadow: "0 28px 70px rgba(41, 39, 36, 0.18)",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: ImageResponse renders standard img elements. */}
        <img
          src={portraitData}
          alt=""
          width="270"
          height="350"
          style={{ width: "100%", height: "100%", objectFit: "cover" }}
        />
      </div>
    </div>,
    size,
  );
}
