import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#12203A",
          borderRadius: "36px",
        }}
      >
        <span
          style={{
            fontSize: "100px",
            fontWeight: 700,
            color: "#9A7230",
            fontFamily: "Georgia,serif",
          }}
        >
          L
        </span>
      </div>
    ),
    { ...size }
  );
}
