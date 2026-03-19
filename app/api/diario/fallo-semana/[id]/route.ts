import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Detalle de Fallo con todos sus análisis ────────────────

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const fallo = await prisma.falloDeLaSemana.findUnique({
    where: { id },
  });

  if (!fallo) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  // All linked análisis
  const analisis = await prisma.analisisSentencia.findMany({
    where: {
      falloDeLaSemanaId: fallo.id,
      isActive: true,
    },
    orderBy: { apoyosCount: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
    },
  });

  return NextResponse.json({
    fallo,
    analisis: analisis.map((a) => ({
      id: a.id,
      titulo: a.titulo,
      resumen: a.resumen,
      apoyosCount: a.apoyosCount,
      citasCount: a.citasCount,
      createdAt: a.createdAt.toISOString(),
      user: a.user,
    })),
  });
}

// ─── PATCH: Admin update / cerrar fallo ──────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
  const { id } = params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const fallo = await prisma.falloDeLaSemana.findUnique({
    where: { id },
  });

  if (!fallo) {
    return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  }

  const body = await request.json();
  const {
    titulo,
    tribunal,
    rol,
    fechaFallo,
    resumen,
    preguntaGuia,
    urlFallo,
    rama,
    materias,
    fechaInicio,
    fechaCierre,
    cerrar,
  } = body as {
    titulo?: string;
    tribunal?: string;
    rol?: string;
    fechaFallo?: string;
    resumen?: string;
    preguntaGuia?: string;
    urlFallo?: string;
    rama?: string;
    materias?: string;
    fechaInicio?: string;
    fechaCierre?: string;
    cerrar?: boolean;
  };

  // Build update data
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const updateData: Record<string, any> = {};

  if (titulo !== undefined) updateData.titulo = titulo.trim();
  if (tribunal !== undefined) updateData.tribunal = tribunal.trim();
  if (rol !== undefined) updateData.rol = rol.trim();
  if (fechaFallo !== undefined) updateData.fechaFallo = fechaFallo.trim();
  if (resumen !== undefined) updateData.resumen = resumen.trim();
  if (preguntaGuia !== undefined) updateData.preguntaGuia = preguntaGuia.trim();
  if (urlFallo !== undefined) updateData.urlFallo = urlFallo.trim() || null;
  if (rama !== undefined) updateData.rama = rama.trim();
  if (materias !== undefined) updateData.materias = materias?.trim() || null;
  if (fechaInicio !== undefined) updateData.fechaInicio = new Date(fechaInicio);
  if (fechaCierre !== undefined) updateData.fechaCierre = new Date(fechaCierre);

  // Manual close
  if (cerrar && fallo.estado === "activo") {
    // Find best análisis
    const topAnalisis = await prisma.analisisSentencia.findMany({
      where: {
        falloDeLaSemanaId: fallo.id,
        isActive: true,
      },
      orderBy: { apoyosCount: "desc" },
      take: 3,
    });

    updateData.estado = "cerrado";
    if (topAnalisis.length > 0) {
      updateData.mejorAnalisisId = topAnalisis[0].id;
    }

    // Award XP to top 3
    const { awardXp } = await import("@/lib/xp-config");
    const {
      XP_FALLO_SEMANA_1,
      XP_FALLO_SEMANA_2,
      XP_FALLO_SEMANA_3,
    } = await import("@/lib/diario-config");

    const xpAmounts = [XP_FALLO_SEMANA_1, XP_FALLO_SEMANA_2, XP_FALLO_SEMANA_3];
    for (let i = 0; i < Math.min(topAnalisis.length, 3); i++) {
      await awardXp({
        userId: topAnalisis[i].userId,
        amount: xpAmounts[i],
        category: "publicaciones",
        prisma,
        detalle: `Fallo de la Semana #${fallo.numero} - Top ${i + 1}`,
      });
    }
  }

  const updated = await prisma.falloDeLaSemana.update({
    where: { id },
    data: updateData,
  });

  return NextResponse.json({ fallo: updated });
}
