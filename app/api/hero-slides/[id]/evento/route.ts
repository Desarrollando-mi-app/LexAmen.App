import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const body = await request.json();
  const { tipo, ubicacion } = body;

  if (!tipo || !["impresion", "clic"].includes(tipo)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  // Intentar obtener userId (no requerido)
  let userId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
  } catch {
    // No autenticado — continuar sin userId
  }

  // Rate limit suave para impresiones: máx 1 por hora por slide+user
  if (tipo === "impresion" && userId) {
    const hace1h = new Date(Date.now() - 60 * 60 * 1000);
    const existente = await prisma.heroSlideEvento.findFirst({
      where: {
        slideId: params.id,
        userId,
        tipo: "impresion",
        createdAt: { gte: hace1h },
      },
    });
    if (existente) {
      return NextResponse.json({ ok: true, dedup: true });
    }
  }

  // Crear evento
  await prisma.heroSlideEvento.create({
    data: {
      slideId: params.id,
      tipo,
      ubicacion: ubicacion || "dashboard",
      userId,
    },
  });

  // Incremento atómico
  if (tipo === "impresion") {
    await prisma.heroSlide.update({
      where: { id: params.id },
      data: { impresiones: { increment: 1 } },
    });
  } else {
    await prisma.heroSlide.update({
      where: { id: params.id },
      data: { clics: { increment: 1 } },
    });
  }

  return NextResponse.json({ ok: true });
}
