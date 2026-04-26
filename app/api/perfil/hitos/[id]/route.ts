import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["estudiantil", "profesional", "academico", "personal"] as const;

// PATCH /api/perfil/hitos/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const hito = await prisma.userHito.findUnique({ where: { id } });
  if (!hito || hito.userId !== authUser.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: {
    tipo?: string;
    titulo?: string;
    descripcion?: string | null;
    institucion?: string | null;
    fecha?: string;
    esActual?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const data: Record<string, unknown> = {};
  if (body.titulo !== undefined) {
    if (body.titulo.trim().length < 2) {
      return NextResponse.json({ error: "Título muy corto" }, { status: 400 });
    }
    data.titulo = body.titulo.trim();
  }
  if (body.tipo !== undefined) {
    if (!TIPOS_VALIDOS.includes(body.tipo as (typeof TIPOS_VALIDOS)[number])) {
      return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
    }
    data.tipo = body.tipo;
  }
  if (body.descripcion !== undefined) data.descripcion = body.descripcion?.trim() || null;
  if (body.institucion !== undefined) data.institucion = body.institucion?.trim() || null;
  if (body.fecha !== undefined) {
    const f = parseFecha(body.fecha);
    if (!f) return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    data.fecha = f;
  }
  if (body.esActual !== undefined) data.esActual = !!body.esActual;

  const updated = await prisma.userHito.update({ where: { id }, data });
  return NextResponse.json({
    ...updated,
    fecha: updated.fecha.toISOString(),
    createdAt: updated.createdAt.toISOString(),
    updatedAt: updated.updatedAt.toISOString(),
  });
}

// DELETE /api/perfil/hitos/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const hito = await prisma.userHito.findUnique({ where: { id } });
  if (!hito || hito.userId !== authUser.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.userHito.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}

function parseFecha(input: string): Date | null {
  if (!input) return null;
  if (/^\d{4}$/.test(input)) return new Date(`${input}-01-01T12:00:00.000Z`);
  if (/^\d{4}-\d{2}$/.test(input)) return new Date(`${input}-01T12:00:00.000Z`);
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d;
}
