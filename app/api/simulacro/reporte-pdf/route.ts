import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { INTERROGADORES } from "@/lib/interrogadores";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const PDFDocument = require("pdfkit");

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

async function llamarClaude(prompt: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) throw new Error("ANTHROPIC_API_KEY no configurada");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": ANTHROPIC_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1024,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Claude API error: ${res.status} — ${errText}`);
  }

  const data = await res.json();
  return data.content[0]?.text || "";
}

const COLORS = {
  navy: "#1A2332",
  gold: "#C5A55A",
  red: "#c41a1a",
  sage: "#5A7A5C",
  burgundy: "#8B3A3A",
  ink: "#2C2C2C",
  inkMid: "#6B6B6B",
  cream: "#F6F1E9",
  rule: "#D4C9B8",
};

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const url = new URL(request.url);
  const sesionId = url.searchParams.get("sesionId");

  if (!sesionId) {
    return NextResponse.json({ error: "sesionId requerido" }, { status: 400 });
  }

  const sesion = await prisma.simulacroSesion.findUnique({
    where: { id: sesionId },
    include: {
      preguntas: { orderBy: { numero: "asc" } },
      user: { select: { firstName: true, lastName: true, email: true } },
    },
  });

  if (!sesion || sesion.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 }
    );
  }

  const interrogador = INTERROGADORES[sesion.interrogadorId];
  if (!interrogador) {
    return NextResponse.json(
      { error: "Interrogador no encontrado" },
      { status: 500 }
    );
  }

  // Get or generate opinion
  let opinion = sesion.opinionFinal;
  if (!opinion) {
    try {
      const detalle = sesion.preguntas
        .filter((p) => p.respuestaUser)
        .map(
          (p, i) =>
            `${i + 1}. Pregunta: "${p.preguntaTexto}" | Respuesta: "${p.respuestaUser}" | ${p.correcta ? "Correcta" : "Incorrecta"}`
        )
        .join("\n");

      const prompt = `${interrogador.systemPrompt}

El estudiante completó ${sesion.totalPreguntas} preguntas: ${sesion.correctas} correctas, ${sesion.incorrectas} incorrectas. Nivel: ${sesion.nivelActual}.

${detalle}

Escribe una opinión final de 150-200 palabras con: fortalezas, áreas a reforzar, 3 recomendaciones y una nota final. En tu estilo natural. Solo texto.`;

      opinion = (await llamarClaude(prompt)).trim();
      await prisma.simulacroSesion.update({
        where: { id: sesionId },
        data: { opinionFinal: opinion },
      });
    } catch {
      opinion = "No fue posible generar la opinión del interrogador.";
    }
  }

  // Generate correct answers for incorrect questions
  const preguntasIncorrectas = sesion.preguntas.filter(
    (p) => p.correcta === false && p.respuestaUser
  );

  const respuestasCorrectas: Record<string, string> = {};
  for (const p of preguntasIncorrectas) {
    try {
      const resp = await llamarClaude(
        `Para la pregunta "${p.preguntaTexto}", proporciona la respuesta correcta completa en 3-5 oraciones, citando artículos del Código Civil si aplica. Solo la respuesta, sin preámbulos.`
      );
      respuestasCorrectas[p.id] = resp.trim();
    } catch {
      respuestasCorrectas[p.id] =
        "No fue posible generar la respuesta correcta.";
    }
  }

  // Build PDF
  const doc = new PDFDocument({
    size: "A4",
    margins: { top: 60, bottom: 60, left: 55, right: 55 },
    info: {
      Title: `Reporte Simulacro - ${interrogador.nombre}`,
      Author: "Studio Iuris",
    },
  });

  const chunks: Buffer[] = [];
  doc.on("data", (chunk: Buffer) => chunks.push(chunk));

  const pdfReady = new Promise<Buffer>((resolve) => {
    doc.on("end", () => resolve(Buffer.concat(chunks)));
  });

  const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

  // ─── Header ───
  doc
    .fontSize(24)
    .fillColor(COLORS.navy)
    .text("Studio ", doc.page.margins.left, 60, { continued: true })
    .fillColor(COLORS.red)
    .text("Iuris");

  doc.moveDown(0.3);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageWidth, doc.y)
    .strokeColor(COLORS.rule)
    .stroke();

  doc.moveDown(0.5);
  doc
    .fontSize(18)
    .fillColor(COLORS.navy)
    .text("REPORTE DE SIMULACRO ORAL", { align: "center" });

  doc.moveDown(1);

  // ─── Info ───
  const fecha = new Date(sesion.createdAt).toLocaleDateString("es-CL", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  const nivelLabels: Record<string, string> = {
    BASICO: "Básico",
    INTERMEDIO: "Intermedio",
    AVANZADO: "Avanzado",
  };

  const infoLines = [
    `Estudiante: ${[sesion.user.firstName, sesion.user.lastName].filter(Boolean).join(" ") || sesion.user.email || "—"}`,
    `Interrogador: ${interrogador.nombre} (${interrogador.tagline})`,
    `Fecha: ${fecha}`,
    `Fuente: ${sesion.fuente === "APUNTES_PROPIOS" ? `Apuntes propios${sesion.apuntesNombre ? ` (${sesion.apuntesNombre})` : ""}` : "Índice Maestro"}`,
    `Preguntas: ${sesion.totalPreguntas}`,
  ];

  doc.fontSize(11).fillColor(COLORS.ink);
  for (const line of infoLines) {
    doc.text(line);
    doc.moveDown(0.2);
  }

  doc.moveDown(0.5);

  // ─── Resultado ───
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageWidth, doc.y)
    .strokeColor(COLORS.gold)
    .lineWidth(2)
    .stroke();
  doc.lineWidth(1);

  doc.moveDown(0.5);
  doc.fontSize(14).fillColor(COLORS.navy).text("RESULTADO GENERAL");
  doc.moveDown(0.3);

  const porcentaje = sesion.totalPreguntas > 0
    ? Math.round((sesion.correctas / sesion.totalPreguntas) * 100)
    : 0;

  doc
    .fontSize(28)
    .fillColor(COLORS.navy)
    .text(`${sesion.correctas}/${sesion.totalPreguntas}`, { continued: true })
    .fontSize(14)
    .fillColor(COLORS.inkMid)
    .text(`  (${porcentaje}%)`);

  doc.moveDown(0.3);
  doc
    .fontSize(11)
    .fillColor(COLORS.inkMid)
    .text(`Nivel alcanzado: ${nivelLabels[sesion.nivelActual] || sesion.nivelActual}`);

  doc.moveDown(1);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageWidth, doc.y)
    .strokeColor(COLORS.gold)
    .lineWidth(2)
    .stroke();
  doc.lineWidth(1);

  doc.moveDown(1);

  // ─── Preguntas ───
  const preguntasRespondidas = sesion.preguntas.filter((p) => p.respuestaUser);

  for (const p of preguntasRespondidas) {
    // Check if enough space
    if (doc.y > doc.page.height - 200) {
      doc.addPage();
    }

    const esCorrecta = p.correcta === true;
    const icon = esCorrecta ? "CORRECTA" : "INCORRECTA";
    const iconColor = esCorrecta ? COLORS.sage : COLORS.burgundy;

    doc
      .fontSize(12)
      .fillColor(COLORS.navy)
      .text(`PREGUNTA ${p.numero}`, { continued: true })
      .fontSize(9)
      .fillColor(COLORS.inkMid)
      .text(`  ·  ${nivelLabels[p.nivel] || p.nivel}  ·  `, { continued: true })
      .fillColor(iconColor)
      .text(icon);

    doc.moveDown(0.2);
    doc
      .moveTo(doc.page.margins.left, doc.y)
      .lineTo(doc.page.margins.left + pageWidth, doc.y)
      .strokeColor(COLORS.rule)
      .stroke();
    doc.moveDown(0.3);

    doc.fontSize(10).fillColor(COLORS.inkMid).text("Pregunta:");
    doc.fontSize(11).fillColor(COLORS.ink).text(p.preguntaTexto);
    doc.moveDown(0.3);

    // If there was a clarification
    if (p.tipoIntercambio === "aclaracion" && p.intercambioTexto) {
      doc.fontSize(10).fillColor(COLORS.inkMid).text("Aclaración del interrogador:");
      doc.fontSize(11).fillColor(COLORS.ink).text(p.intercambioTexto);
      doc.moveDown(0.3);
    }

    doc.fontSize(10).fillColor(COLORS.inkMid).text("Tu respuesta:");
    doc
      .fontSize(11)
      .fillColor(COLORS.ink)
      .text(p.respuestaUser || "—");
    doc.moveDown(0.3);

    // If there was a follow-up
    if (p.tipoIntercambio === "repregunta" && p.intercambioTexto) {
      doc.fontSize(10).fillColor(COLORS.inkMid).text("Repregunta del interrogador:");
      doc.fontSize(11).fillColor(COLORS.ink).text(p.intercambioTexto);
      doc.moveDown(0.2);
      if (p.respuestaIntercambio) {
        doc.fontSize(10).fillColor(COLORS.inkMid).text("Tu segunda respuesta:");
        doc.fontSize(11).fillColor(COLORS.ink).text(p.respuestaIntercambio);
        doc.moveDown(0.3);
      }
    }

    if (p.evaluacion) {
      doc.fontSize(10).fillColor(COLORS.inkMid).text("Evaluación:");
      doc.fontSize(11).fillColor(COLORS.ink).text(p.evaluacion);
      doc.moveDown(0.3);
    }

    // Correct answer for wrong questions
    if (!esCorrecta && respuestasCorrectas[p.id]) {
      doc.fontSize(10).fillColor(COLORS.sage).text("Respuesta correcta:");
      doc.fontSize(11).fillColor(COLORS.ink).text(respuestasCorrectas[p.id]);
      doc.moveDown(0.3);
    }

    doc.moveDown(0.5);
  }

  // ─── Opinion ───
  if (doc.y > doc.page.height - 250) {
    doc.addPage();
  }

  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageWidth, doc.y)
    .strokeColor(COLORS.gold)
    .lineWidth(2)
    .stroke();
  doc.lineWidth(1);

  doc.moveDown(0.5);
  doc
    .fontSize(14)
    .fillColor(COLORS.navy)
    .text(`OPINIÓN DE ${interrogador.nombre.toUpperCase()}`);
  doc.moveDown(0.5);
  doc.fontSize(11).fillColor(COLORS.ink).text(opinion || "—", {
    align: "justify",
  });

  // ─── Footer ───
  doc.moveDown(2);
  doc
    .moveTo(doc.page.margins.left, doc.y)
    .lineTo(doc.page.margins.left + pageWidth, doc.y)
    .strokeColor(COLORS.rule)
    .stroke();
  doc.moveDown(0.3);
  doc
    .fontSize(9)
    .fillColor(COLORS.inkMid)
    .text("Studio Iuris · studioiuris.cl · 2026", { align: "center" });

  doc.end();
  const pdfBuffer = await pdfReady;

  return new NextResponse(new Uint8Array(pdfBuffer), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="reporte-simulacro-${fecha.replace(/\s/g, "-")}.pdf"`,
    },
  });
}
