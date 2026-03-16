import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/definiciones/stats
 * Devuelve estadísticas del usuario en definiciones.
 */
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [total, correctas] = await Promise.all([
    prisma.definicionIntento.count({ where: { userId: authUser.id } }),
    prisma.definicionIntento.count({
      where: { userId: authUser.id, correcta: true },
    }),
  ]);

  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const hoy = await prisma.definicionIntento.count({
    where: { userId: authUser.id, createdAt: { gte: startOfToday } },
  });

  return NextResponse.json({
    total,
    correctas,
    incorrectas: total - correctas,
    porcentaje: total > 0 ? Math.round((correctas / total) * 100) : 0,
    hoy,
  });
}
