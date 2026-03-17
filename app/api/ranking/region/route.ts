import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const { searchParams } = new URL(request.url);
  const vista = searchParams.get("vista") ?? "nacional";

  if (vista === "nacional") {
    const regiones = await prisma.user.groupBy({
      by: ["region"],
      where: { region: { not: null }, deletedAt: null, suspended: false, visibleEnRanking: true },
      _count: { id: true },
      _sum: { xp: true },
      _avg: { xp: true },
      orderBy: { _sum: { xp: "desc" } },
    });

    const items = regiones
      .filter((r) => r.region !== null)
      .map((r, i) => ({
        rank: i + 1,
        region: r.region!,
        totalUsuarios: r._count.id,
        totalXp: r._sum.xp ?? 0,
        promedioXp: Math.round(r._avg.xp ?? 0),
      }));

    return NextResponse.json({ vista: "nacional", items });
  }

  if (vista === "region") {
    const region = searchParams.get("region");
    if (!region) return NextResponse.json({ error: "Parámetro 'region' requerido" }, { status: 400 });

    const cortes = await prisma.user.groupBy({
      by: ["corte"],
      where: { region, corte: { not: null }, deletedAt: null, suspended: false, visibleEnRanking: true },
      _count: { id: true },
      _sum: { xp: true },
      _avg: { xp: true },
      orderBy: { _sum: { xp: "desc" } },
    });

    const items = cortes
      .filter((c) => c.corte !== null)
      .map((c, i) => ({
        rank: i + 1,
        corte: c.corte!,
        totalUsuarios: c._count.id,
        totalXp: c._sum.xp ?? 0,
        promedioXp: Math.round(c._avg.xp ?? 0),
      }));

    return NextResponse.json({ vista: "region", region, items });
  }

  if (vista === "corte") {
    const corte = searchParams.get("corte");
    if (!corte) return NextResponse.json({ error: "Parámetro 'corte' requerido" }, { status: 400 });

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { corte, deletedAt: null, suspended: false, visibleEnRanking: true },
        orderBy: { xp: "desc" },
        skip,
        take: limit,
        select: {
          id: true, firstName: true, lastName: true, avatarUrl: true,
          xp: true, grado: true, universidad: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      }),
      prisma.user.count({ where: { corte, deletedAt: null, suspended: false } }),
    ]);

    const items = users.map((u, i) => ({
      rank: skip + i + 1,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      xp: u.xp,
      universidad: u.universidad,
      tier: u.leagueMembers[0]?.league.tier ?? null,
      grado: u.grado,
    }));

    let miPosicion: number | null = null;
    if (authUser) {
      const me = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { corte: true, xp: true },
      });
      if (me?.corte === corte) {
        const higher = await prisma.user.count({
          where: { corte, deletedAt: null, suspended: false, visibleEnRanking: true, xp: { gt: me.xp } },
        });
        miPosicion = higher + 1;
      }
    }

    return NextResponse.json({ vista: "corte", corte, items, total, page, totalPages: Math.ceil(total / limit), miPosicion });
  }

  if (vista === "usuarios") {
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: { deletedAt: null, suspended: false, visibleEnRanking: true },
        orderBy: { xp: "desc" },
        skip,
        take: limit,
        select: {
          id: true, firstName: true, lastName: true, avatarUrl: true,
          xp: true, grado: true, universidad: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      }),
      prisma.user.count({ where: { deletedAt: null, suspended: false } }),
    ]);

    const items = users.map((u, i) => ({
      rank: skip + i + 1,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      xp: u.xp,
      universidad: u.universidad,
      tier: u.leagueMembers[0]?.league.tier ?? null,
      grado: u.grado,
    }));

    let miPosicion: number | null = null;
    if (authUser) {
      const me = await prisma.user.findUnique({
        where: { id: authUser.id },
        select: { xp: true },
      });
      if (me) {
        const higher = await prisma.user.count({
          where: { deletedAt: null, suspended: false, visibleEnRanking: true, xp: { gt: me.xp } },
        });
        miPosicion = higher + 1;
      }
    }

    return NextResponse.json({ vista: "usuarios", items, total, page, totalPages: Math.ceil(total / limit), miPosicion });
  }

  return NextResponse.json({ error: "Vista inválida" }, { status: 400 });
}
