import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const MOTIVOS_VALIDOS = [
  "spam",
  "contenido_ofensivo",
  "plagio",
  "acoso",
  "informacion_falsa",
  "otro",
];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    reportadoId: string;
    contenidoId?: string;
    contenidoTipo?: string;
    motivo: string;
    descripcion?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { reportadoId, contenidoId, contenidoTipo, motivo, descripcion } = body;

  if (!reportadoId || !motivo) {
    return NextResponse.json(
      { error: "reportadoId y motivo son requeridos" },
      { status: 400 }
    );
  }

  if (!MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json(
      { error: "Motivo no válido" },
      { status: 400 }
    );
  }

  // Can't report yourself
  if (reportadoId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes reportarte a ti mismo" },
      { status: 400 }
    );
  }

  // Check for duplicate report (same reporter + reported + content)
  const existing = await prisma.reporteUsuario.findFirst({
    where: {
      reporterId: authUser.id,
      reportadoId,
      ...(contenidoId ? { contenidoId } : {}),
      estado: "pendiente",
    },
  });

  if (existing) {
    return NextResponse.json(
      { error: "Ya has reportado este contenido" },
      { status: 409 }
    );
  }

  await prisma.reporteUsuario.create({
    data: {
      reporterId: authUser.id,
      reportadoId,
      contenidoId: contenidoId ?? null,
      contenidoTipo: contenidoTipo ?? null,
      motivo,
      descripcion: descripcion?.slice(0, 1000) ?? null,
    },
  });

  return NextResponse.json({ ok: true, message: "Reporte enviado" });
}
