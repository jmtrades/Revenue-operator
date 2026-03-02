import { ImageResponse } from "next/og";

export const alt = "Recall Touch — AI Phone System for Every Business";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0B",
          color: "#EDEDEF",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        <div style={{ fontSize: 48, fontWeight: 700, letterSpacing: "-0.03em" }}>
          Recall Touch
        </div>
        <div style={{ fontSize: 24, color: "#8B8B8D", marginTop: 16 }}>
          AI Phone System for Every Business
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
