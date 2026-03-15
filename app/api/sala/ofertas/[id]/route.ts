import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Obtener oferta por ID ──────────────────────────

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const oferta = await prisma.ofertaTrabajo.findFirst({
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

  if (!oferta) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  return NextResponse.json(oferta);
}

// ─── PATCH: Editar oferta ────────────────────────────────

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

  const existing = await prisma.ofertaTrabajo.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
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
    "cargo",
    "areaPractica",
    "descripcion",
    "ciudad",
    "formato",
    "tipoContrato",
    "experienciaReq",
    "remuneracion",
    "requisitos",
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

  const updated = await prisma.ofertaTrabajo.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// ─── DELETE: Desactivar oferta (soft delete) ─────────────

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

  const existing = await prisma.ofertaTrabajo.findUnique({
    where: { id },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // Allow author or admin
  if (existing.userId !== authUser.id) {
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });

    if (!dbUser?.isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  await prisma.ofertaTrabajo.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
