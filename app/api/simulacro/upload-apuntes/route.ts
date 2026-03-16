import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
export const runtime = "nodejs";

const MAX_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_CHARS = 15000;

/* ─── Route handler ────────────────────────────────────────── */

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json(
      { error: "No se recibió archivo" },
      { status: 400 }
    );
  }

  if (file.size > MAX_SIZE) {
    return NextResponse.json(
      { error: "El archivo excede el límite de 10MB" },
      { status: 400 }
    );
  }

  const nombre = file.name;
  const ext = nombre.split(".").pop()?.toLowerCase();

  if (!ext || !["pdf", "docx"].includes(ext)) {
    return NextResponse.json(
      { error: "Solo se aceptan archivos PDF y DOCX" },
      { status: 400 }
    );
  }

  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);

  let texto = "";

  try {
    if (ext === "pdf") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const pdf = require("pdf-parse/lib/pdf-parse");
      const data = await pdf(Buffer.from(buffer));
      texto = data.text || "";
    } else if (ext === "docx") {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const mammoth = require("mammoth");
      const result = await mammoth.extractRawText({ buffer });
      texto = result.value || "";
    }
  } catch (err) {
    console.error("Error extrayendo texto:", err);
    const errMsg = err instanceof Error ? err.message.toLowerCase() : "";
    if (errMsg.includes("password") || errMsg.includes("encrypt")) {
      return NextResponse.json(
        { error: "El archivo está protegido con contraseña. Sube una versión sin protección." },
        { status: 400 }
      );
    }
    if (errMsg.includes("corrupt") || errMsg.includes("invalid")) {
      return NextResponse.json(
        { error: "El archivo parece estar dañado o en un formato no compatible." },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: "No se pudo extraer el texto del archivo. Intenta con otro formato." },
      { status: 500 }
    );
  }

  // Limpiar y truncar
  texto = texto.replace(/\s+/g, " ").trim();
  if (texto.length > MAX_CHARS) {
    texto = texto.slice(0, MAX_CHARS);
  }

  if (texto.length < 50) {
    return NextResponse.json(
      { error: "El archivo no contiene suficiente texto legible. Asegúrate de que no sea solo imágenes o esté vacío." },
      { status: 400 }
    );
  }

  return NextResponse.json({
    texto,
    nombre,
    caracteres: texto.length,
  });
}
