import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Mis ayudantías + streak ─────────────────────────

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const [ayudantias, streak] = await Promise.all([
    prisma.ayudantia.findMany({
      where: { userId: authUser.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.ayudantiaStreak.findUnique({
      where: { userId: authUser.id },
    }),
  ]);

  const serialized = ayudantias.map((a) => ({
    id: a.id,
    type: a.type,
    materia: a.materia,
    format: a.format,
    priceType: a.priceType,
    priceAmount: a.priceAmount,
    description: a.description,
    universidad: a.universidad,
    orientadaA: a.orientadaA,
    contactMethod: a.contactMethod,
    contactValue: a.contactValue,
    isActive: a.isActive,
    reportCount: a.reportCount,
    createdAt: a.createdAt.toISOString(),
  }));

  return NextResponse.json({
    ayudantias: serialized,
    streak: streak
      ? {
          monthsActive: streak.monthsActive,
          longestStreak: streak.longestStreak,
          lastActiveMonth: streak.lastActiveMonth,
        }
      : null,
  });
}
