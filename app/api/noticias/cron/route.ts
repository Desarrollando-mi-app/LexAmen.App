import { NextRequest, NextResponse } from "next/server";
import { recopilarNoticias } from "@/lib/news-scrapers";
import { prisma } from "@/lib/prisma";

/**
 * Cron de noticias jurídicas — ejecuta diariamente.
 *
 * 1. Auto-elimina noticias PENDIENTES con más de 3 días (no aprobadas a tiempo)
 * 2. Recopila noticias nuevas de 6 fuentes (BCN, PJ, TC, DO, Colegio)
 */

async function runCron() {
  // 1. Auto-delete: pendientes > 3 días
  const THREE_DAYS_AGO = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const deleted = await prisma.noticiaJuridica.deleteMany({
    where: {
      estado: "pendiente",
      fechaRecopilacion: { lt: THREE_DAYS_AGO },
    },
  });

  // 2. Recopilar nuevas
  const result = await recopilarNoticias();

  return {
    ...result,
    eliminadasAutoborrado: deleted.count,
    timestamp: new Date().toISOString(),
  };
}

export async function POST(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

// Also allow GET for Vercel cron (Vercel cron sends GET requests)
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  try {
    const result = await runCron();
    return NextResponse.json(result);
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
