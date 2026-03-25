import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 6,
          fontSize: 18,
          fontWeight: 700,
          color: "#4F8CFF",
          fontFamily: "Inter, system-ui, sans-serif",
        }}
      >
        R
      </div>
    ),
    { width: 32, height: 32 }
  );
}
