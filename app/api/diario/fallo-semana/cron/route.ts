import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { sendNotification } from "@/lib/notifications";
import {
  XP_FALLO_SEMANA_1,
  XP_FALLO_SEMANA_2,
  XP_FALLO_SEMANA_3,
} from "@/lib/diario-config";

// ─── Cron: Cerrar fallos vencidos y premiar mejores análisis ─────

async function processFalloCron() {
  const now = new Date();

  // 1. Find active fallos with fechaCierre <= now
  const fallosVencidos = await prisma.falloDeLaSemana.findMany({
    where: {
      estado: "activo",
      fechaCierre: { lte: now },
    },
  });

  const results = [];

  for (const fallo of fallosVencidos) {
    // 2. Find top análisis by apoyosCount
    const topAnalisis = await prisma.analisisSentencia.findMany({
      where: {
        falloDeLaSemanaId: fallo.id,
        isActive: true,
      },
      orderBy: { apoyosCount: "desc" },
      take: 3,
      select: {
        id: true,
        userId: true,
        titulo: true,
        apoyosCount: true,
      },
    });

    // 3. Set mejorAnalisisId and close
    await prisma.falloDeLaSemana.update({
      where: { id: fallo.id },
      data: {
        estado: "cerrado",
        mejorAnalisisId: topAnalisis.length > 0 ? topAnalisis[0].id : null,
      },
    });

    // 4. Award XP to top 3
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

    // 5. Notify all participants
    const participantes = await prisma.analisisSentencia.findMany({
      where: {
        falloDeLaSemanaId: fallo.id,
        isActive: true,
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    for (const p of participantes) {
      await sendNotification({
        type: "NEW_CONTENT",
        title: `Fallo de la Semana #${fallo.numero} cerrado`,
        body: `El Fallo de la Semana "${fallo.titulo}" ha sido cerrado. Revisa los resultados y el mejor analisis.`,
        targetUserId: p.userId,
      });
    }

    results.push({
      falloId: fallo.id,
      numero: fallo.numero,
      analisisCount: topAnalisis.length,
      mejorAnalisisId: topAnalisis[0]?.id || null,
    });
  }

  return {
    processed: results.length,
    results,
    timestamp: now.toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await processFalloCron();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Vercel cron sends GET requests
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await processFalloCron();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
