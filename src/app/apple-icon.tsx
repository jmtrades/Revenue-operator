import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#0A0A0B",
          borderRadius: 36,
          fontSize: 100,
          fontWeight: 700,
          color: "#4F8CFF",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        R
      </div>
    ),
    { width: 180, height: 180 }
  );
}
