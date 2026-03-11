import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  // Proteger con CRON_SECRET
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const now = new Date();

  // Activar slides aprobados cuya fechaInicio ya pasó
  const activados = await prisma.heroSlide.updateMany({
    where: {
      estado: "aprobado",
      fechaInicio: { lte: now },
    },
    data: { estado: "activo" },
  });

  // Finalizar slides activos cuya fechaFin ya pasó
  const finalizados = await prisma.heroSlide.updateMany({
    where: {
      estado: "activo",
      fechaFin: { not: null, lt: now },
    },
    data: { estado: "finalizado" },
  });

  return NextResponse.json({
    activados: activados.count,
    finalizados: finalizados.count,
    timestamp: now.toISOString(),
  });
}
