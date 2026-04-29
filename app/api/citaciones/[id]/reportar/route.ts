import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST /api/citaciones/[id]/reportar ────────────────────────
//
// Cualquier usuario autenticado puede reportar una cita interna
// sospechosa. Razones válidas: inflado | irrelevante | plagio | otro.
// Rate limit: 5 reportes / 24h por usuario para prevenir abuso.
// El propio autor citado no necesita reportar (puede pedirlo a admin
// directamente), pero no lo bloqueamos a nivel de API.

const VALID_REASONS = new Set([
  "inflado",
  "irrelevante",
  "plagio",
  "otro",
]);
const RATE_LIMIT_PER_DAY = 5;

export async function POST(
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

  // Rate limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const recent = await prisma.citacionReporte.count({
    where: {
      reportedById: authUser.id,
      createdAt: { gte: oneDayAgo },
    },
  });
  if (recent >= RATE_LIMIT_PER_DAY) {
    return NextResponse.json(
      {
        error: `Has alcanzado el límite de ${RATE_LIMIT_PER_DAY} reportes por día.`,
      },
      { status: 429 },
    );
  }

  let body: { reason?: string; details?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }
  const reason = body.reason?.trim() ?? "";
  const details = body.details?.trim() ?? "";

  if (!VALID_REASONS.has(reason)) {
    return NextResponse.json({ error: "Razón inválida." }, { status: 400 });
  }
  if (reason === "otro" && details.length < 10) {
    return NextResponse.json(
      { error: "Para 'otro' debes describir el motivo (mín. 10 caracteres)." },
      { status: 400 },
    );
  }

  // Cita debe existir
  const cita = await prisma.citacion.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!cita) {
    return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
  }

  // Evitar duplicados del mismo usuario sobre la misma cita (abierto)
  const dup = await prisma.citacionReporte.findFirst({
    where: {
      citacionId: id,
      reportedById: authUser.id,
      status: "abierto",
    },
    select: { id: true },
  });
  if (dup) {
    return NextResponse.json(
      { error: "Ya tienes un reporte abierto sobre esta cita." },
      { status: 409 },
    );
  }

  await prisma.citacionReporte.create({
    data: {
      citacionId: id,
      reportedById: authUser.id,
      reason,
      details: details || null,
      status: "abierto",
    },
  });

  return NextResponse.json({ ok: true }, { status: 201 });
}
