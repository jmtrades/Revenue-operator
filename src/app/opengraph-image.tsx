import { ImageResponse } from "next/og";

export const alt = "Recall Touch — AI phone agents for every business";
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
          background: "linear-gradient(135deg, #0A0A0B 0%, #111114 100%)",
          color: "#EDEDEF",
          fontFamily: "Inter, system-ui, sans-serif",
          padding: "60px",
        }}
      >
        <div
          style={{
            fontSize: 20,
            fontWeight: 500,
            color: "#10B981",
            letterSpacing: "0.05em",
            textTransform: "uppercase" as const,
            marginBottom: 16,
          }}
        >
          AI Phone Agents
        </div>
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            letterSpacing: "-0.03em",
            textAlign: "center",
            lineHeight: 1.15,
          }}
        >
          Recall Touch
        </div>
        <div
          style={{
            fontSize: 24,
            color: "#8B8B8D",
            marginTop: 20,
            textAlign: "center",
            maxWidth: 700,
            lineHeight: 1.4,
          }}
        >
          AI that makes and takes your phone calls
        </div>
        <div
          style={{
            display: "flex",
            gap: 24,
            marginTop: 40,
            fontSize: 16,
            color: "#6B6B6D",
          }}
        >
          <span>Answer calls</span>
          <span style={{ color: "#10B981" }}>·</span>
          <span>Make calls</span>
          <span style={{ color: "#10B981" }}>·</span>
          <span>Book appointments</span>
          <span style={{ color: "#10B981" }}>·</span>
          <span>Recover revenue</span>
        </div>
        <div
          style={{
            marginTop: 32,
            fontSize: 14,
            color: "#4B4B4D",
          }}
        >
          Any business · Any industry · Try free
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  );
}
