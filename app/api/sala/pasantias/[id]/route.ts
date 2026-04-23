import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Obtener pasantía por ID ────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const pasantia = await prisma.pasantia.findUnique({
    where: { id, isActive: true, isHidden: false },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
    },
  });

  if (!pasantia) {
    return NextResponse.json({ error: "Pasantía no encontrada" }, { status: 404 });
  }

  return NextResponse.json(pasantia);
}

// ─── PATCH: Editar pasantía ──────────────────────────────

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

  const existing = await prisma.pasantia.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Pasantía no encontrada" }, { status: 404 });
  }

  if (existing.userId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const allowedFields = [
    "empresa",
    "areaPractica",
    "titulo",
    "descripcion",
    "ciudad",
    "formato",
    "jornada",
    "duracion",
    "remuneracion",
    "montoRemu",
    "requisitos",
    "cupos",
    "anioMinimoCarrera",
    "promedioMinimo",
    "areasRequeridas",
    "postulacionTipo",
    "postulacionUrl",
    "contactoWhatsapp",
    "contactoEmail",
    "metodoPostulacion",
    "contactoPostulacion",
    "isActive",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Normalizar fechas (las enviamos como ISO string desde el cliente)
  if (body.fechaInicio !== undefined) {
    updateData.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio as string) : null;
  }
  if (body.fechaLimite !== undefined) {
    updateData.fechaLimite = body.fechaLimite ? new Date(body.fechaLimite as string) : null;
  }

  const updated = await prisma.pasantia.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// ─── DELETE: Desactivar pasantía (soft delete) ───────────

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

  const existing = await prisma.pasantia.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "Pasantía no encontrada" }, { status: 404 });
  }

  // Allow author or admin
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (existing.userId !== authUser.id && !user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.pasantia.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
