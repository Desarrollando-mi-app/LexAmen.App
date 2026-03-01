import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST: Reportar ayudantía ─────────────────────────────

export async function POST(
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

  let body: { reason: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.reason || body.reason.trim().length === 0) {
    return NextResponse.json(
      { error: "Debes indicar una razón" },
      { status: 400 }
    );
  }

  const ayudantia = await prisma.ayudantia.findUnique({
    where: { id: ayudantiaId },
    select: { id: true, userId: true, reportCount: true },
  });

  if (!ayudantia) {
    return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  }

  // No puede reportar su propia publicación
  if (ayudantia.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes reportar tu propia publicación" },
      { status: 400 }
    );
  }

  // Upsert reporte (@@unique previene doble reporte)
  try {
    await prisma.ayudantiaReport.create({
      data: {
        ayudantiaId,
        reportedById: authUser.id,
        reason: body.reason.trim(),
      },
    });
  } catch {
    // Unique constraint — ya reportó
    return NextResponse.json(
      { error: "Ya reportaste esta publicación" },
      { status: 400 }
    );
  }

  // Incrementar reportCount
  const updated = await prisma.ayudantia.update({
    where: { id: ayudantiaId },
    data: {
      reportCount: { increment: 1 },
      // Auto-desactivar si >= 3 reportes
      ...(ayudantia.reportCount + 1 >= 3 && { isActive: false }),
    },
  });

  return NextResponse.json({
    success: true,
    reportCount: updated.reportCount,
    deactivated: updated.reportCount >= 3,
  });
}
