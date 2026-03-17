/**
 * GET   /api/plan-estudio/sesiones/[fecha] — Detalle de sesión por fecha
 * PATCH /api/plan-estudio/sesiones/[fecha] — Marcar sesión como completada
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ fecha: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { fecha } = await params;

    // Validate date format
    const fechaDate = new Date(fecha + "T00:00:00.000Z");
    if (isNaN(fechaDate.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const plan = await prisma.planEstudio.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "No hay plan de estudio" }, { status: 404 });
    }

    const sesion = await prisma.planSesionDiaria.findUnique({
      where: {
        planId_fecha: {
          planId: plan.id,
          fecha: fechaDate,
        },
      },
    });

    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    // Parse actividades JSON
    let actividades: { temaId?: string; temaNombre: string; actividad: string; duracionMin: number }[] = [];
    try {
      actividades =
        typeof sesion.actividades === "string"
          ? JSON.parse(sesion.actividades)
          : sesion.actividades;
    } catch {
      actividades = [];
    }

    return NextResponse.json({
      sesion: {
        id: sesion.id,
        fecha: sesion.fecha.toISOString().split("T")[0],
        actividades,
        completada: sesion.completada,
        xpGanado: sesion.xpGanado,
        calendarEventId: sesion.calendarEventId,
      },
    });
  } catch (error) {
    console.error("[plan-estudio/sesiones/fecha] GET Error:", error);
    return NextResponse.json(
      { error: "Error al obtener sesión" },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ fecha: string }> }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const { fecha } = await params;
    const body = await req.json();
    const { completada } = body;

    if (typeof completada !== "boolean") {
      return NextResponse.json(
        { error: "Campo 'completada' (boolean) es requerido" },
        { status: 400 }
      );
    }

    // Validate date format
    const fechaDate = new Date(fecha + "T00:00:00.000Z");
    if (isNaN(fechaDate.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const plan = await prisma.planEstudio.findUnique({
      where: { userId: user.id },
      select: { id: true },
    });

    if (!plan) {
      return NextResponse.json({ error: "No hay plan de estudio" }, { status: 404 });
    }

    const sesion = await prisma.planSesionDiaria.findUnique({
      where: {
        planId_fecha: {
          planId: plan.id,
          fecha: fechaDate,
        },
      },
    });

    if (!sesion) {
      return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
    }

    const XP_POR_SESION = 15;
    let xpGanado = sesion.xpGanado;

    // Award XP when marking as completed (only if not already completed)
    if (completada && !sesion.completada) {
      await awardXp({
        userId: user.id,
        amount: XP_POR_SESION,
        category: "estudio",
        prisma,
        detalle: "Sesión del plan completada",
        materia: "Plan de Estudios",
      });
      xpGanado = XP_POR_SESION;
    }

    const updated = await prisma.planSesionDiaria.update({
      where: { id: sesion.id },
      data: {
        completada,
        xpGanado: completada ? xpGanado : 0,
      },
    });

    // Parse actividades for response
    let actividades: { temaId?: string; temaNombre: string; actividad: string; duracionMin: number }[] = [];
    try {
      actividades =
        typeof updated.actividades === "string"
          ? JSON.parse(updated.actividades)
          : updated.actividades;
    } catch {
      actividades = [];
    }

    return NextResponse.json({
      sesion: {
        id: updated.id,
        fecha: updated.fecha.toISOString().split("T")[0],
        actividades,
        completada: updated.completada,
        xpGanado: updated.xpGanado,
        calendarEventId: updated.calendarEventId,
      },
    });
  } catch (error) {
    console.error("[plan-estudio/sesiones/fecha] PATCH Error:", error);
    return NextResponse.json(
      { error: "Error al actualizar sesión" },
      { status: 500 }
    );
  }
}
