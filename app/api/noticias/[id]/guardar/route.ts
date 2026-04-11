import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ guardada: false });
  }

  const { id } = await params;
  const existing = await prisma.noticiaGuardada.findUnique({
    where: { noticiaId_userId: { noticiaId: id, userId: authUser.id } },
  });

  return NextResponse.json({ guardada: !!existing });
}

export async function POST(
  _req: NextRequest,
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

  // Toggle: if exists → delete, if not → create
  const existing = await prisma.noticiaGuardada.findUnique({
    where: { noticiaId_userId: { noticiaId: id, userId: authUser.id } },
  });

  if (existing) {
    await prisma.noticiaGuardada.delete({ where: { id: existing.id } });
    return NextResponse.json({ guardada: false });
  }

  await prisma.noticiaGuardada.create({
    data: { noticiaId: id, userId: authUser.id },
  });

  return NextResponse.json({ guardada: true });
}
