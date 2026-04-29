import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── PATCH /api/admin/citaciones-reportes/[id] ─────────────────
//
// Resuelve un reporte de cita interna: marcar como 'resuelto' (la
// redacción tomó acción — eliminar cita, llamar al autor, etc.) o
// 'descartado' (falso positivo). Cada acción escribe AdminLog.
//
// Body: { action: "resolver" | "descartar", notas?: string }

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

  let body: { action?: string; notas?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const action = body.action;
  const notas = body.notas?.trim() ?? "";

  if (action !== "resolver" && action !== "descartar") {
    return NextResponse.json(
      { error: "action debe ser 'resolver' o 'descartar'." },
      { status: 400 },
    );
  }

  const reporte = await prisma.citacionReporte.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      reason: true,
      citacionId: true,
      reportedById: true,
    },
  });
  if (!reporte) {
    return NextResponse.json({ error: "Reporte no encontrado." }, { status: 404 });
  }
  if (reporte.status !== "abierto") {
    return NextResponse.json(
      { error: "Este reporte ya fue resuelto." },
      { status: 400 },
    );
  }

  const nuevoEstado = action === "resolver" ? "resuelto" : "descartado";

  await prisma.$transaction([
    prisma.citacionReporte.update({
      where: { id },
      data: { status: nuevoEstado },
    }),
    prisma.adminLog.create({
      data: {
        adminId: authUser.id,
        action:
          action === "resolver"
            ? "RESOLVE_CITACION_REPORTE"
            : "DISMISS_CITACION_REPORTE",
        target: reporte.id,
        metadata: {
          citacionId: reporte.citacionId,
          reason: reporte.reason,
          reportedById: reporte.reportedById,
          notas: notas || null,
        },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: nuevoEstado });
}
