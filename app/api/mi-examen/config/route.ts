/**
 * POST /api/mi-examen/config — Crear o actualizar configuración de examen
 * GET  /api/mi-examen/config — Obtener configuración con temas
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET — Obtener configuración actual ─────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const config = await prisma.examenConfig.findUnique({
    where: { userId: user.id },
    include: {
      temas: {
        orderBy: { orden: "asc" },
      },
    },
  });

  if (!config) {
    return NextResponse.json({ config: null });
  }

  return NextResponse.json({ config });
}

// ─── POST — Crear o actualizar configuración ────────────────

export async function POST(req: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await req.json();
  const { universidad, sede, fechaExamen, cedularioTexto } = body;

  if (!universidad || typeof universidad !== "string") {
    return NextResponse.json(
      { error: "La universidad es requerida" },
      { status: 400 }
    );
  }

  // Parse fechaExamen if provided
  let fechaExamenDate: Date | null = null;
  if (fechaExamen) {
    fechaExamenDate = new Date(fechaExamen);
    if (isNaN(fechaExamenDate.getTime())) {
      return NextResponse.json(
        { error: "Fecha de examen inválida" },
        { status: 400 }
      );
    }
  }

  // Check if config exists
  const existing = await prisma.examenConfig.findUnique({
    where: { userId: user.id },
  });

  let config;

  if (existing) {
    // Update existing config
    const updateData: Record<string, unknown> = {
      universidad,
      sede: sede || null,
      fechaExamen: fechaExamenDate,
    };

    // If cedularioTexto is provided, update cedulario fields and reset parsing
    if (cedularioTexto && typeof cedularioTexto === "string") {
      if (cedularioTexto.trim().length < 20) {
        return NextResponse.json(
          { error: "El texto del cedulario es muy corto" },
          { status: 400 }
        );
      }
      updateData.cedularioTexto = cedularioTexto.trim();
      updateData.cedularioSource = "text";
      updateData.parseStatus = "pending";
      updateData.parseError = null;
      updateData.parsedAt = null;

      // Delete existing temas when re-uploading cedulario
      await prisma.examenTema.deleteMany({
        where: { examenConfigId: existing.id },
      });
    }

    config = await prisma.examenConfig.update({
      where: { userId: user.id },
      data: updateData,
      include: {
        temas: {
          orderBy: { orden: "asc" },
        },
      },
    });
  } else {
    // Create new config
    const createData: Record<string, unknown> = {
      userId: user.id,
      universidad,
      sede: sede || null,
      fechaExamen: fechaExamenDate,
    };

    if (cedularioTexto && typeof cedularioTexto === "string") {
      if (cedularioTexto.trim().length < 20) {
        return NextResponse.json(
          { error: "El texto del cedulario es muy corto" },
          { status: 400 }
        );
      }
      createData.cedularioTexto = cedularioTexto.trim();
      createData.cedularioSource = "text";
    }

    config = await prisma.examenConfig.create({
      data: createData as {
        userId: string;
        universidad: string;
        sede?: string | null;
        fechaExamen?: Date | null;
        cedularioTexto?: string | null;
        cedularioSource?: string | null;
      },
      include: {
        temas: {
          orderBy: { orden: "asc" },
        },
      },
    });
  }

  return NextResponse.json({ config });
}
