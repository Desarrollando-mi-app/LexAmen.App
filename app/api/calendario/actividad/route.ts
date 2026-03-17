import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/calendario/actividad
// Modo día:  ?fecha=2026-03-16  → XpLogs del día agrupados por hora
// Modo mes:  ?mes=2026-03      → total XP por día del mes
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const fecha = searchParams.get("fecha");
  const mes = searchParams.get("mes");

  // ─── Modo día: detalle por hora ────────────────────────────
  if (fecha) {
    const dayStart = new Date(`${fecha}T00:00:00`);
    const dayEnd = new Date(`${fecha}T23:59:59.999`);

    if (isNaN(dayStart.getTime())) {
      return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
    }

    const logs = await prisma.xpLog.findMany({
      where: {
        userId: authUser.id,
        createdAt: { gte: dayStart, lte: dayEnd },
      },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        amount: true,
        category: true,
        detalle: true,
        materia: true,
        createdAt: true,
      },
    });

    // Agrupar por hora
    const porHora: Record<
      number,
      { logs: typeof logs; totalXp: number }
    > = {};

    let totalDia = 0;

    for (const log of logs) {
      const hora = new Date(log.createdAt).getHours();
      if (!porHora[hora]) {
        porHora[hora] = { logs: [], totalXp: 0 };
      }
      porHora[hora].logs.push(log);
      porHora[hora].totalXp += log.amount;
      totalDia += log.amount;
    }

    // Desglose por materia
    const porMateria: Record<string, number> = {};
    for (const log of logs) {
      if (log.materia && log.amount > 0) {
        porMateria[log.materia] = (porMateria[log.materia] || 0) + log.amount;
      }
    }

    // Desglose por detalle
    const porDetalle: Record<string, number> = {};
    for (const log of logs) {
      if (log.detalle && log.amount > 0) {
        porDetalle[log.detalle] = (porDetalle[log.detalle] || 0) + log.amount;
      }
    }

    return NextResponse.json({
      modo: "dia",
      fecha,
      totalXp: totalDia,
      totalActividades: logs.length,
      porHora,
      porMateria,
      porDetalle,
      logs,
    });
  }

  // ─── Modo mes: XP por día ─────────────────────────────────
  if (mes) {
    const match = mes.match(/^(\d{4})-(\d{2})$/);
    if (!match) {
      return NextResponse.json({ error: "Formato de mes inválido (YYYY-MM)" }, { status: 400 });
    }

    const year = parseInt(match[1]);
    const month = parseInt(match[2]);
    const mesStart = new Date(year, month - 1, 1);
    const mesEnd = new Date(year, month, 0, 23, 59, 59, 999);

    const logs = await prisma.xpLog.findMany({
      where: {
        userId: authUser.id,
        createdAt: { gte: mesStart, lte: mesEnd },
        amount: { gt: 0 },
      },
      select: {
        amount: true,
        category: true,
        createdAt: true,
      },
    });

    // Agrupar por día
    const porDia: Record<string, { totalXp: number; actividades: number }> = {};

    for (const log of logs) {
      const d = new Date(log.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      if (!porDia[key]) {
        porDia[key] = { totalXp: 0, actividades: 0 };
      }
      porDia[key].totalXp += log.amount;
      porDia[key].actividades += 1;
    }

    return NextResponse.json({
      modo: "mes",
      mes,
      porDia,
    });
  }

  return NextResponse.json(
    { error: "Parámetro requerido: ?fecha=YYYY-MM-DD o ?mes=YYYY-MM" },
    { status: 400 }
  );
}
