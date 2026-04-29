import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { recalculateUserMetrics } from "@/lib/citations";

// ─── PATCH /api/admin/citas-externas/[id] ───────────────────────
//
// Resuelve una declaración pendiente.
// Body: { action: "verify" | "reject", reviewNotes?: string }
//
// Verify  → status='verificada', citationsExternal++ en Investigación,
//           recalculateUserMetrics(autor) fuera de la TX (best-effort,
//           cron diario lo corregirá si falla).
// Reject  → status='rechazada', reviewNotes obligatorio (>=10 chars),
//           NO se incrementa nada.
//
// Cada acción escribe un AdminLog con adminId, action UPPER_CASE,
// target=citaId, metadata (snapshot del estado).

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dbAdmin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!dbAdmin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: { action?: string; reviewNotes?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const action = body.action;
  const reviewNotes = body.reviewNotes?.trim() ?? "";

  if (action !== "verify" && action !== "reject") {
    return NextResponse.json(
      { error: "action debe ser 'verify' o 'reject'." },
      { status: 400 },
    );
  }
  if (action === "reject" && reviewNotes.length < 10) {
    return NextResponse.json(
      { error: "El motivo del rechazo debe tener al menos 10 caracteres." },
      { status: 400 },
    );
  }

  const cita = await prisma.citacionExterna.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      investigacionId: true,
      citingTitle: true,
      declaredById: true,
    },
  });
  if (!cita) {
    return NextResponse.json({ error: "Declaración no encontrada." }, { status: 404 });
  }
  if (cita.status !== "pendiente") {
    return NextResponse.json(
      { error: "Esta declaración ya fue revisada." },
      { status: 400 },
    );
  }

  const ahora = new Date();

  if (action === "verify") {
    let citedAuthorId: string | null = null;
    await prisma.$transaction(async (tx) => {
      await tx.citacionExterna.update({
        where: { id },
        data: {
          status: "verificada",
          reviewedById: authUser.id,
          reviewedAt: ahora,
          reviewNotes: reviewNotes || null,
        },
      });
      const updatedInv = await tx.investigacion.update({
        where: { id: cita.investigacionId },
        data: { citationsExternal: { increment: 1 } },
        select: { userId: true },
      });
      citedAuthorId = updatedInv.userId;
      await tx.adminLog.create({
        data: {
          adminId: authUser.id,
          action: "VERIFY_CITA_EXTERNA",
          target: cita.id,
          metadata: {
            investigacionId: cita.investigacionId,
            citedAuthorId: updatedInv.userId,
            declaredById: cita.declaredById,
            citingTitle: cita.citingTitle,
          },
        },
      });
    });

    // Recalcular métricas FUERA de la TX (best-effort)
    if (citedAuthorId) {
      try {
        await recalculateUserMetrics(citedAuthorId);
      } catch (e) {
        console.error("[citas-externas] error recalculando métricas:", e);
        // No revertir — el cron diario lo corregirá
      }
    }

    return NextResponse.json({ ok: true, status: "verificada" });
  }

  // action === "reject"
  await prisma.$transaction([
    prisma.citacionExterna.update({
      where: { id },
      data: {
        status: "rechazada",
        reviewedById: authUser.id,
        reviewedAt: ahora,
        reviewNotes,
      },
    }),
    prisma.adminLog.create({
      data: {
        adminId: authUser.id,
        action: "REJECT_CITA_EXTERNA",
        target: cita.id,
        metadata: {
          investigacionId: cita.investigacionId,
          declaredById: cita.declaredById,
          citingTitle: cita.citingTitle,
          reviewNotes,
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: "rechazada" });
}
