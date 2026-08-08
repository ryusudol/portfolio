import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const size = { width: 64, height: 64 };
export const contentType = "image/png";

const portrait = await readFile(
  join(process.cwd(), "public/images/portrait/suhyeon-mountain-profile.png"),
);
const portraitData = `data:image/png;base64,${portrait.toString("base64")}`;

export default function Icon() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        overflow: "hidden",
      }}
    >
      {/* biome-ignore lint/performance/noImgElement: ImageResponse renders standard img elements. */}
      <img
        src={portraitData}
        alt=""
        width={64}
        height={64}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          // Keep the face framed in the tiny tab icon.
          objectPosition: "center 18%",
        }}
      />
    </div>,
    size,
  );
}
