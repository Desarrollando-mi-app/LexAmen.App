import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Fetch causa
  const causa = await prisma.causa.findUnique({
    where: { id },
  });

  if (!causa) {
    return NextResponse.json(
      { error: "Causa no encontrada" },
      { status: 404 }
    );
  }

  if (causa.challengedId !== authUser.id) {
    return NextResponse.json(
      { error: "Solo el retado puede rechazar" },
      { status: 403 }
    );
  }

  if (causa.status !== "PENDING") {
    return NextResponse.json(
      { error: "La causa no está pendiente" },
      { status: 400 }
    );
  }

  // 3. Actualizar estado
  const updated = await prisma.causa.update({
    where: { id },
    data: { status: "REJECTED" },
  });

  return NextResponse.json({
    id: updated.id,
    status: updated.status,
  });
}
