/**
 * GET /api/mi-examen/progreso — Progreso actual por tema
 *
 * Recalcula el progreso del usuario en cada tema del cedulario
 * y retorna sugerencia de estudio personalizada.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  calculateTemaProgress,
  generateStudySuggestion,
} from "@/lib/mi-examen-utils";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Get config with temas
  const config = await prisma.examenConfig.findUnique({
    where: { userId: user.id },
    include: {
      temas: {
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!config) {
    return NextResponse.json(
      { error: "No tienes una configuración de examen" },
      { status: 404 }
    );
  }

  if (config.parseStatus !== "completed" || config.temas.length === 0) {
    return NextResponse.json({
      config,
      temas: config.temas,
      progresoGlobal: 0,
      diasRestantes: null,
      sugerenciaHoy: null,
    });
  }

  // Recalculate progress for each tema with mapping
  const updatedTemas = [];

  for (const tema of config.temas) {
    if (tema.materiaMapping && tema.tieneContenido) {
      const progress = await calculateTemaProgress(
        user.id,
        tema.materiaMapping,
        tema.libroMapping,
        tema.tituloMapping
      );

      // Update in DB
      await prisma.examenTema.update({
        where: { id: tema.id },
        data: {
          flashcardsDominadas: progress.flashcardsDominadas,
          mcqCorrectas: progress.mcqCorrectas,
          vfCorrectas: progress.vfCorrectas,
          porcentajeAvance: progress.porcentaje,
        },
      });

      updatedTemas.push({
        ...tema,
        flashcardsDominadas: progress.flashcardsDominadas,
        mcqCorrectas: progress.mcqCorrectas,
        vfCorrectas: progress.vfCorrectas,
        porcentajeAvance: progress.porcentaje,
      });
    } else {
      updatedTemas.push(tema);
    }
  }

  // Calculate global progress (weighted average by peso)
  let totalWeight = 0;
  let weightedProgress = 0;

  for (const tema of updatedTemas) {
    if (tema.tieneContenido) {
      totalWeight += tema.peso;
      weightedProgress += tema.porcentajeAvance * tema.peso;
    }
  }

  const progresoGlobal =
    totalWeight > 0
      ? Math.round((weightedProgress / totalWeight) * 10) / 10
      : 0;

  // Calculate days remaining
  let diasRestantes: number | null = null;
  if (config.fechaExamen) {
    const now = new Date();
    const diff = config.fechaExamen.getTime() - now.getTime();
    diasRestantes = Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }

  // Generate study suggestion
  const sugerenciaHoy = generateStudySuggestion(updatedTemas, diasRestantes);

  return NextResponse.json({
    config: {
      id: config.id,
      universidad: config.universidad,
      sede: config.sede,
      fechaExamen: config.fechaExamen,
      parseStatus: config.parseStatus,
      parsedAt: config.parsedAt,
    },
    temas: updatedTemas,
    progresoGlobal,
    diasRestantes,
    sugerenciaHoy,
  });
}
