import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { updateAyudantiaStreak } from "@/lib/ayudantia-streak";
import { getUserTutorStats } from "@/lib/sala-utils";

// ─── POST: Crear ayudantía ────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    type: string;
    materia: string;
    format: string;
    priceType: string;
    priceAmount?: number;
    description: string;
    universidad: string;
    orientadaA: string[];
    contactMethod: string;
    contactValue: string;
    titulo?: string;
    disponibilidad?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const {
    type,
    materia,
    format,
    priceType,
    priceAmount,
    description,
    universidad,
    orientadaA,
    contactMethod,
    contactValue,
    titulo,
    disponibilidad,
  } = body;

  // Validaciones
  if (!type || !materia || !format || !priceType || !description || !universidad || !contactMethod || !contactValue) {
    return NextResponse.json(
      { error: "Faltan campos requeridos" },
      { status: 400 }
    );
  }

  if (description.length > 500) {
    return NextResponse.json(
      { error: "La descripción no puede exceder 500 caracteres" },
      { status: 400 }
    );
  }

  if (!["OFREZCO", "BUSCO"].includes(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  if (!["ONLINE", "PRESENCIAL", "AMBOS"].includes(format)) {
    return NextResponse.json({ error: "Formato inválido" }, { status: 400 });
  }

  if (!["GRATUITO", "PAGADO"].includes(priceType)) {
    return NextResponse.json({ error: "Tipo de precio inválido" }, { status: 400 });
  }

  if (!["WHATSAPP", "EMAIL", "OTRO"].includes(contactMethod)) {
    return NextResponse.json({ error: "Método de contacto inválido" }, { status: 400 });
  }

  // Actualizar streak si es OFREZCO
  if (type === "OFREZCO") {
    await updateAyudantiaStreak(authUser.id);
  }

  const ayudantia = await prisma.ayudantia.create({
    data: {
      userId: authUser.id,
      type: type as "OFREZCO" | "BUSCO",
      materia,
      format: format as "ONLINE" | "PRESENCIAL" | "AMBOS",
      priceType: priceType as "GRATUITO" | "PAGADO",
      priceAmount: priceType === "PAGADO" ? priceAmount ?? 0 : null,
      description,
      universidad,
      orientadaA: orientadaA ?? [],
      contactMethod: contactMethod as "WHATSAPP" | "EMAIL" | "OTRO",
      contactValue,
      titulo: titulo?.trim() || "",
      disponibilidad: disponibilidad?.trim() || null,
    },
  });

  return NextResponse.json(ayudantia, { status: 201 });
}

// ─── GET: Listar ayudantías ───────────────────────────────

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const materia = searchParams.get("materia");
  const format = searchParams.get("format");
  const priceType = searchParams.get("priceType");
  const universidad = searchParams.get("universidad");

  const where: Record<string, unknown> = { isActive: true, isHidden: false };

  if (type) where.type = type;
  if (materia) where.materia = materia;
  if (format) where.format = format;
  if (priceType) where.priceType = priceType;
  if (universidad) where.universidad = universidad;

  const ayudantias = await prisma.ayudantia.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: {
              league: { select: { tier: true } },
            },
          },
        },
      },
      _count: {
        select: {
          sesiones: { where: { status: "completada" } },
        },
      },
    },
  });

  // Fetch streaks para los usuarios que tienen ayudantías OFREZCO
  const userIds = Array.from(new Set(ayudantias.map((a) => a.userId)));
  const streaks = await prisma.ayudantiaStreak.findMany({
    where: { userId: { in: userIds } },
  });
  const streakMap = Object.fromEntries(
    streaks.map((s) => [s.userId, s])
  );

  // Fetch rating stats for all users in the results
  const userStatsMap = new Map<string, Awaited<ReturnType<typeof getUserTutorStats>>>();
  await Promise.all(
    userIds.map(async (uid) => {
      const stats = await getUserTutorStats(uid);
      userStatsMap.set(uid, stats);
    })
  );

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
    createdAt: a.createdAt.toISOString(),
    sesionesCompletadas: a._count.sesiones,
    user: {
      id: a.user.id,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      avatarUrl: a.user.avatarUrl,
      universidad: a.user.universidad,
      tier: a.user.leagueMembers[0]?.league.tier ?? null,
      stats: userStatsMap.get(a.userId) ?? null,
    },
    streak: streakMap[a.userId]
      ? {
          monthsActive: streakMap[a.userId].monthsActive,
          longestStreak: streakMap[a.userId].longestStreak,
        }
      : null,
  }));

  return NextResponse.json(serialized);
}
