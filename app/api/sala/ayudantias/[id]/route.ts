import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateAyudantiaStreak } from "@/lib/ayudantia-streak";

// ─── PATCH: Editar ayudantía ──────────────────────────────

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const ayudantiaId = params.id;

  const existing = await prisma.ayudantia.findUnique({
    where: { id: ayudantiaId },
    select: { userId: true, type: true, isActive: true },
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

  // Validar descripción si se envía
  if (body.description && typeof body.description === "string" && body.description.length > 500) {
    return NextResponse.json(
      { error: "La descripción no puede exceder 500 caracteres" },
      { status: 400 }
    );
  }

  // Campos editables
  const allowedFields = [
    "materia",
    "format",
    "priceType",
    "priceAmount",
    "description",
    "universidad",
    "orientadaA",
    "contactMethod",
    "contactValue",
    "isActive",
  ];

  const updateData: Record<string, unknown> = {};
  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }

  // Si se reactiva y es OFREZCO, actualizar streak
  if (updateData.isActive === true && !existing.isActive && existing.type === "OFREZCO") {
    await updateAyudantiaStreak(authUser.id);
  }

  const updated = await prisma.ayudantia.update({
    where: { id: ayudantiaId },
    data: updateData,
  });

  return NextResponse.json(updated);
}

// ─── DELETE: Desactivar ayudantía (soft delete) ───────────

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const ayudantiaId = params.id;

  const existing = await prisma.ayudantia.findUnique({
    where: { id: ayudantiaId },
    select: { userId: true },
  });

  if (!existing) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  if (existing.userId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.ayudantia.update({
    where: { id: ayudantiaId },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
