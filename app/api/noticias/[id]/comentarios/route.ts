import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  const comentarios = await prisma.noticiaComentario.findMany({
    where: { noticiaId: id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    comentarios: comentarios.map((c) => ({
      id: c.id,
      contenido: c.contenido,
      createdAt: c.createdAt.toISOString(),
      user: {
        id: c.user.id,
        firstName: c.user.firstName,
        lastName: c.user.lastName,
        avatarUrl: c.user.avatarUrl,
      },
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { id } = await params;

  // Check premium
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });
  if (!user || user.plan === "FREE") {
    return NextResponse.json(
      { error: "Función exclusiva para usuarios Premium" },
      { status: 403 },
    );
  }

  let body: { contenido: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { contenido } = body;
  if (!contenido || contenido.trim().length === 0 || contenido.length > 500) {
    return NextResponse.json(
      { error: "El comentario debe tener entre 1 y 500 caracteres" },
      { status: 400 },
    );
  }

  const comentario = await prisma.noticiaComentario.create({
    data: {
      noticiaId: id,
      userId: authUser.id,
      contenido: contenido.trim(),
    },
    include: {
      user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true } },
    },
  });

  return NextResponse.json({
    id: comentario.id,
    contenido: comentario.contenido,
    createdAt: comentario.createdAt.toISOString(),
    user: {
      id: comentario.user.id,
      firstName: comentario.user.firstName,
      lastName: comentario.user.lastName,
      avatarUrl: comentario.user.avatarUrl,
    },
  });
}
