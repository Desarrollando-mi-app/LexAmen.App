/**
 * GET  /api/plan-estudio/config — Obtener plan actual
 * POST /api/plan-estudio/config — Crear/actualizar configuración
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const plan = await prisma.planEstudio.findUnique({
    where: { userId: user.id },
    include: {
      temas: { orderBy: { prioridad: "asc" } },
      sesiones: { orderBy: { fecha: "asc" } },
    },
  });

  return NextResponse.json({ plan });
}

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { fechaExamen, horasEstudioDia, diasDescanso, modoGeneracion } = body;

  if (!fechaExamen) {
    return NextResponse.json(
      { error: "La fecha de examen es obligatoria" },
      { status: 400 }
    );
  }

  const fecha = new Date(fechaExamen);
  if (isNaN(fecha.getTime()) || fecha <= new Date()) {
    return NextResponse.json(
      { error: "La fecha de examen debe ser futura" },
      { status: 400 }
    );
  }

  const horas = Math.max(1, Math.min(8, horasEstudioDia ?? 3));
  const descanso = Array.isArray(diasDescanso)
    ? JSON.stringify(diasDescanso)
    : "[]";
  const modo = modoGeneracion === "manual" ? "manual" : "automatico";

  const plan = await prisma.planEstudio.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      fechaExamen: fecha,
      horasEstudioDia: horas,
      diasDescanso: descanso,
      modoGeneracion: modo,
      estado: "configurando",
    },
    update: {
      fechaExamen: fecha,
      horasEstudioDia: horas,
      diasDescanso: descanso,
      modoGeneracion: modo,
    },
  });

  // Sync UserCountdown for exam date
  const existing = await prisma.userCountdown.findFirst({
    where: { userId: user.id, isGrado: true },
  });

  if (existing) {
    await prisma.userCountdown.update({
      where: { id: existing.id },
      data: { fecha, titulo: "Examen de Grado" },
    });
  } else {
    await prisma.userCountdown.create({
      data: {
        userId: user.id,
        titulo: "Examen de Grado",
        fecha,
        color: "#9a7230",
        isGrado: true,
      },
    });
  }

  return NextResponse.json({ plan });
}
