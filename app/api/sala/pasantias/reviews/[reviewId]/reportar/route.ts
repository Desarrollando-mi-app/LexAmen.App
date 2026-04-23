import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/sala/pasantias/reviews/[reviewId]/reportar
 *
 * Reporta una reseña para que un admin la modere. Acepta motivo libre
 * (truncado a 500 caracteres). No esconde la reseña automáticamente;
 * sólo marca `reported = true` y queda en cola de moderación.
 *
 * Autorización: cualquier usuario autenticado puede reportar. Evitamos
 * permitir a la víctima "silenciar" la reseña a su gusto — es el admin
 * quien decide si se oculta (campo `hiddenByAdmin`).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ reviewId: string }> },
) {
  const { reviewId } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: { reason?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const reason = body.reason?.trim().slice(0, 500) ?? null;

  const review = await prisma.pasantiaReview.findUnique({
    where: { id: reviewId },
    select: { id: true, reported: true },
  });
  if (!review) {
    return NextResponse.json({ error: "Reseña no encontrada" }, { status: 404 });
  }

  // Idempotencia: si ya está reportada no pisamos la razón original.
  if (review.reported) {
    return NextResponse.json(
      { ok: true, alreadyReported: true },
      { status: 200 },
    );
  }

  await prisma.pasantiaReview.update({
    where: { id: reviewId },
    data: {
      reported: true,
      reportedAt: new Date(),
      reportReason: reason,
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
