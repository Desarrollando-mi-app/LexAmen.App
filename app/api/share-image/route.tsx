import { ImageResponse } from "next/og";

export const runtime = "edge";

export async function POST(req: Request) {
  const { modulo, materia, total, correctas, xp, racha, grado } =
    await req.json();

  return new ImageResponse(
    (
      <div
        style={{
          width: 1080,
          height: 1080,
          background: "linear-gradient(180deg, #f5f0e6 0%, #ebe4d4 100%)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "serif",
          position: "relative",
        }}
      >
        {/* Paper grain overlay */}
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            opacity: 0.03,
            background:
              "repeating-linear-gradient(0deg, #000 0px, transparent 1px, transparent 3px)",
          }}
        />

        {/* Border frame */}
        <div
          style={{
            position: "absolute",
            top: 40,
            left: 40,
            right: 40,
            bottom: 40,
            border: "2px solid #c4b99a",
            display: "flex",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 46,
            left: 46,
            right: 46,
            bottom: 46,
            border: "1px solid #ddd5c4",
            display: "flex",
          }}
        />

        {/* Logo */}
        <div
          style={{
            fontSize: 56,
            fontWeight: 700,
            color: "#2a2520",
            letterSpacing: "-1px",
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <span>⚖</span>
          <span>Studio Iuris</span>
        </div>

        {/* Divider */}
        <div
          style={{
            width: 120,
            height: 2,
            background: "#9a7230",
            marginTop: 24,
            marginBottom: 24,
            display: "flex",
          }}
        />

        {/* Label */}
        <div
          style={{
            fontSize: 22,
            fontWeight: 600,
            color: "#9a7230",
            letterSpacing: 6,
            textTransform: "uppercase",
            marginBottom: 50,
            display: "flex",
          }}
        >
          Sesión Completada
        </div>

        {/* Stats */}
        <div
          style={{
            display: "flex",
            gap: 80,
            marginBottom: 50,
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "#2a2520",
                lineHeight: 1,
                display: "flex",
              }}
            >
              {correctas}/{total}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#8a8073",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginTop: 8,
                display: "flex",
              }}
            >
              Correctas
            </div>
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                fontSize: 80,
                fontWeight: 700,
                color: "#9a7230",
                lineHeight: 1,
                display: "flex",
              }}
            >
              +{xp}
            </div>
            <div
              style={{
                fontSize: 16,
                color: "#8a8073",
                letterSpacing: 3,
                textTransform: "uppercase",
                marginTop: 8,
                display: "flex",
              }}
            >
              XP Ganados
            </div>
          </div>
        </div>

        {/* Module + Materia */}
        <div
          style={{
            fontSize: 28,
            color: "#4a433a",
            display: "flex",
          }}
        >
          {modulo}
          {materia ? ` · ${materia}` : ""}
        </div>

        {/* Grado + Racha */}
        {(grado || racha) && (
          <div
            style={{
              fontSize: 22,
              color: "#8a8073",
              marginTop: 16,
              display: "flex",
            }}
          >
            {grado ? `Grado ${grado}` : ""}
            {grado && racha ? " · " : ""}
            {racha ? `Racha ${racha} días 🔥` : ""}
          </div>
        )}

        {/* URL */}
        <div
          style={{
            fontSize: 18,
            color: "#c4b99a",
            marginTop: 50,
            letterSpacing: 2,
            display: "flex",
          }}
        >
          studioiuris.cl
        </div>
      </div>
    ),
    { width: 1080, height: 1080 }
  );
}
