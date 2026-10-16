import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import path from "node:path";
export const alt =
  "Run Pookie Run — Little runs. Big good vibes. Featuring the original Pookie character.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default async function Image() {
  const art = await readFile(
    path.join(process.cwd(), "public/pookie/run-pookie-run.png"),
  );
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        background: "#fff8e6",
        color: "#2a211b",
        padding: 48,
        alignItems: "center",
        gap: 35,
        borderBottom: "22px solid #c4acf0",
      }}
    >
      <div style={{ display: "flex", flexDirection: "column", width: 620 }}>
        <span style={{ fontSize: 29, fontWeight: 700, marginBottom: 42 }}>
          RUN POOKIE RUN!
        </span>
        <span
          style={{
            fontSize: 83,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1.02,
          }}
        >
          Little runs.
        </span>
        <span
          style={{
            fontSize: 83,
            fontWeight: 800,
            letterSpacing: -5,
            lineHeight: 1.02,
            color: "#bd391c",
          }}
        >
          Big good vibes.
        </span>
        <span style={{ fontSize: 25, marginTop: 36, maxWidth: 560 }}>
          Your feel-good running companion. A week that fits your life.
        </span>
      </div>
      {/* ImageResponse uses native HTML images, not the Next image optimizer. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={`data:image/png;base64,${art.toString("base64")}`}
        alt=""
        width={430}
        height={430}
        style={{
          border: "3px solid #2a211b",
          borderRadius: 80,
          transform: "rotate(4deg)",
        }}
      />
    </div>,
    size,
  );
}
