import { ImageResponse } from "next/og";

export const alt = "LéxAmen — Aprende Derecho Civil y Procesal Civil";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          backgroundColor: "#12203A",
          padding: "60px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span style={{ fontSize: "72px" }}>⚖️</span>
          <span
            style={{
              fontSize: "80px",
              fontWeight: 700,
              color: "#F6F1E9",
              fontFamily: "serif",
            }}
          >
            LéxAmen
          </span>
        </div>
        <p
          style={{
            fontSize: "32px",
            color: "#9A7230",
            marginTop: "32px",
            textAlign: "center",
          }}
        >
          Domina el Derecho Civil y Procesal Civil
        </p>
        <p
          style={{
            fontSize: "22px",
            color: "rgba(246,241,233,0.6)",
            marginTop: "16px",
          }}
        >
          Flashcards · Preguntas · Duelos · Liga semanal
        </p>
      </div>
    ),
    { ...size }
  );
}
