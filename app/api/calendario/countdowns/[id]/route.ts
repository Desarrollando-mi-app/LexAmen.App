import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/calendario/countdowns/[id]
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

  const countdown = await prisma.userCountdown.findUnique({ where: { id } });
  if (!countdown || countdown.userId !== authUser.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  let body: {
    titulo?: string;
    fecha?: string;
    color?: string;
    isGrado?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Si se marca como grado, verificar que no exista otro
  if (body.isGrado && !countdown.isGrado) {
    const existing = await prisma.userCountdown.findFirst({
      where: { userId: authUser.id, isGrado: true, id: { not: id } },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes un countdown de examen de grado" },
        { status: 409 }
      );
    }
  }

  const updated = await prisma.userCountdown.update({
    where: { id },
    data: {
      ...(body.titulo !== undefined && { titulo: body.titulo.trim() }),
      ...(body.fecha !== undefined && { fecha: new Date(body.fecha) }),
      ...(body.color !== undefined && { color: body.color }),
      ...(body.isGrado !== undefined && { isGrado: body.isGrado }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/calendario/countdowns/[id]
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

  const countdown = await prisma.userCountdown.findUnique({ where: { id } });
  if (!countdown || countdown.userId !== authUser.id) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  await prisma.userCountdown.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
