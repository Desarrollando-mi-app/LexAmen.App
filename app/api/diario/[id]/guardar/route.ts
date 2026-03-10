import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST: Toggle bookmark (guardar/desguardar) ──────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: postId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Verificar que el post existe
  const post = await prisma.diarioPost.findUnique({
    where: { id: postId },
    select: { id: true },
  });

  if (!post) {
    return NextResponse.json({ error: "Post no encontrado" }, { status: 404 });
  }

  // Toggle: si existe, eliminar; si no, crear
  const existing = await prisma.diarioGuardado.findUnique({
    where: { userId_postId: { userId: authUser.id, postId } },
  });

  if (existing) {
    await prisma.diarioGuardado.delete({
      where: { id: existing.id },
    });
    return NextResponse.json({ guardado: false });
  }

  await prisma.diarioGuardado.create({
    data: { userId: authUser.id, postId },
  });

  return NextResponse.json({ guardado: true });
}
