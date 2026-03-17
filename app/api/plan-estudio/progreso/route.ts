/**
 * GET /api/plan-estudio/progreso — Resumen de progreso del plan de estudio
 */

export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateTemaProgress } from "@/lib/mi-examen-utils";

const RAMA_NOMBRES: Record<string, string> = {
  DERECHO_CIVIL: "Derecho Civil",
  DERECHO_PROCESAL_CIVIL: "Derecho Procesal Civil",
  DERECHO_ORGANICO: "Código Orgánico de Tribunales",
};

export async function GET() {
  try {
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

    if (!plan) {
      return NextResponse.json({ error: "No hay plan de estudio" }, { status: 404 });
    }

    // ─── Calculate progress for each tema ─────────────────────
    const temasActualizados = await Promise.all(
      plan.temas.map(async (tema) => {
        const progress = await calculateTemaProgress(
          user.id,
          tema.rama,
          tema.libro,
          tema.titulo
        );

        const porcentaje = Math.round(progress.porcentaje * 100) / 100;
        const completado = porcentaje >= 90;

        // Update in DB if changed
        if (tema.porcentaje !== porcentaje || tema.completado !== completado) {
          await prisma.planTema.update({
            where: { id: tema.id },
            data: { porcentaje, completado },
          });
        }

        return {
          ...tema,
          porcentaje,
          completado,
        };
      })
    );

    // ─── General progress ─────────────────────────────────────
    const temasTotal = temasActualizados.length;
    const temasCompletados = temasActualizados.filter((t) => t.completado).length;

    const totalHoras = temasActualizados.reduce((sum, t) => sum + t.estimacionHoras, 0);
    const porcentajeGeneral =
      totalHoras > 0
        ? Math.round(
            (temasActualizados.reduce(
              (sum, t) => sum + t.porcentaje * t.estimacionHoras,
              0
            ) /
              totalHoras) *
              100
          ) / 100
        : 0;

    const ahora = new Date();
    const fechaExamen = new Date(plan.fechaExamen);
    const diasRestantes = Math.max(
      0,
      Math.ceil((fechaExamen.getTime() - ahora.getTime()) / (1000 * 60 * 60 * 24))
    );

    const sesionesCompletadas = plan.sesiones.filter((s) => s.completada).length;
    const sesionesPendientes = plan.sesiones.filter((s) => !s.completada).length;

    // ─── Group temas by rama ──────────────────────────────────
    const ramaMap = new Map<
      string,
      { rama: string; nombre: string; temas: typeof temasActualizados; porcentajeRama: number }
    >();

    for (const tema of temasActualizados) {
      if (!ramaMap.has(tema.rama)) {
        ramaMap.set(tema.rama, {
          rama: tema.rama,
          nombre: RAMA_NOMBRES[tema.rama] || tema.rama,
          temas: [],
          porcentajeRama: 0,
        });
      }
      ramaMap.get(tema.rama)!.temas.push(tema);
    }

    const porRama = Array.from(ramaMap.values()).map((grupo) => {
      const avg =
        grupo.temas.length > 0
          ? Math.round(
              (grupo.temas.reduce((sum, t) => sum + t.porcentaje, 0) / grupo.temas.length) * 100
            ) / 100
          : 0;

      return {
        rama: grupo.rama,
        nombre: grupo.nombre,
        temas: grupo.temas.map((t) => ({
          nombre: t.nombre,
          porcentaje: t.porcentaje,
          prioridad: t.prioridad,
          completado: t.completado,
        })),
        porcentajeRama: avg,
      };
    });

    // ─── Próxima sesión ───────────────────────────────────────
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const proximaSesionRaw = plan.sesiones.find((s) => {
      const fechaSesion = new Date(s.fecha);
      fechaSesion.setHours(0, 0, 0, 0);
      return fechaSesion >= hoy && !s.completada;
    });

    let proximaSesion: {
      fecha: string;
      actividades: { temaNombre: string; actividad: string; duracionMin: number }[];
    } | null = null;

    if (proximaSesionRaw) {
      let actividades: { temaNombre: string; actividad: string; duracionMin: number }[] = [];
      try {
        actividades =
          typeof proximaSesionRaw.actividades === "string"
            ? JSON.parse(proximaSesionRaw.actividades)
            : proximaSesionRaw.actividades;
      } catch {
        actividades = [];
      }

      proximaSesion = {
        fecha: proximaSesionRaw.fecha.toISOString().split("T")[0],
        actividades,
      };
    }

    return NextResponse.json({
      general: {
        temasTotal,
        temasCompletados,
        porcentajeGeneral,
        diasRestantes,
        sesionesCompletadas,
        sesionesPendientes,
      },
      porRama,
      proximaSesion,
    });
  } catch (error) {
    console.error("[plan-estudio/progreso] Error:", error);
    return NextResponse.json(
      { error: "Error al obtener progreso" },
      { status: 500 }
    );
  }
}
