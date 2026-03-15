/**
 * POST /api/mi-examen/reporte — Registrar reporte post-examen
 *
 * Permite al usuario reportar qué materias le preguntaron en su examen.
 * Esta data se acumula para mejorar pesos de temas por universidad.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const {
    fechaExamen,
    aprobado,
    materiasPreguntadas,
    comentario,
    dificultadPercibida,
  } = body;

  // Validations
  if (!fechaExamen) {
    return NextResponse.json(
      { error: "La fecha del examen es requerida" },
      { status: 400 }
    );
  }

  const fechaDate = new Date(fechaExamen);
  if (isNaN(fechaDate.getTime())) {
    return NextResponse.json(
      { error: "Fecha de examen inválida" },
      { status: 400 }
    );
  }

  if (
    !materiasPreguntadas ||
    !Array.isArray(materiasPreguntadas) ||
    materiasPreguntadas.length === 0
  ) {
    return NextResponse.json(
      { error: "Debes indicar al menos una materia que te preguntaron" },
      { status: 400 }
    );
  }

  if (
    dificultadPercibida !== undefined &&
    dificultadPercibida !== null &&
    (dificultadPercibida < 1 || dificultadPercibida > 5)
  ) {
    return NextResponse.json(
      { error: "La dificultad debe ser entre 1 y 5" },
      { status: 400 }
    );
  }

  // Get user's config for universidad
  const config = await prisma.examenConfig.findUnique({
    where: { userId: user.id },
    select: { universidad: true },
  });

  const universidad = config?.universidad ?? "desconocida";

  const reporte = await prisma.examenReporte.create({
    data: {
      userId: user.id,
      universidad,
      fechaExamen: fechaDate,
      aprobado: aprobado ?? null,
      materiasPreguntadas: JSON.stringify(materiasPreguntadas),
      comentario: comentario || null,
      dificultadPercibida: dificultadPercibida ?? null,
    },
  });

  // Side effect (future): update ExamenTema weights based on accumulated reports
  // When 10+ reports from same university report the same tema,
  // that tema should have higher peso for future users.
  // Not implemented now — documented for future iteration.

  return NextResponse.json({ reporte });
}
