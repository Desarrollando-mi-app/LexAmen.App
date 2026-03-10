import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ranking/facultad
 *
 * Tres vistas:
 *  1. ?view=nacional          → Ranking de universidades (agrupado por universidad)
 *  2. ?view=universidad&u=X   → Sedes de universidad X
 *  3. ?view=sede&u=X&s=Y      → Top usuarios de universidad X, sede Y
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const view = searchParams.get("view") ?? "nacional";

  // ─── Vista Nacional: ranking de universidades ───────────
  if (view === "nacional") {
    const universidades = await prisma.user.groupBy({
      by: ["universidad"],
      where: {
        universidad: { not: null },
        deletedAt: null,
        suspended: false,
      },
      _count: { id: true },
      _sum: { xp: true },
      _avg: { xp: true },
      orderBy: { _sum: { xp: "desc" } },
    });

    const items = universidades
      .filter((u) => u.universidad !== null)
      .map((u, i) => ({
        rank: i + 1,
        universidad: u.universidad!,
        studentCount: u._count.id,
        totalXp: u._sum.xp ?? 0,
        avgXp: Math.round(u._avg.xp ?? 0),
      }));

    return NextResponse.json({ view: "nacional", items });
  }

  // ─── Vista Universidad: sedes de una universidad ────────
  if (view === "universidad") {
    const universidad = searchParams.get("u");
    if (!universidad) {
      return NextResponse.json(
        { error: "Parámetro 'u' requerido" },
        { status: 400 }
      );
    }

    const sedes = await prisma.user.groupBy({
      by: ["sede"],
      where: {
        universidad,
        sede: { not: null },
        deletedAt: null,
        suspended: false,
      },
      _count: { id: true },
      _sum: { xp: true },
      _avg: { xp: true },
      orderBy: { _sum: { xp: "desc" } },
    });

    const items = sedes
      .filter((s) => s.sede !== null)
      .map((s, i) => ({
        rank: i + 1,
        sede: s.sede!,
        studentCount: s._count.id,
        totalXp: s._sum.xp ?? 0,
        avgXp: Math.round(s._avg.xp ?? 0),
      }));

    return NextResponse.json({ view: "universidad", universidad, items });
  }

  // ─── Vista Sede: top estudiantes de una sede ────────────
  if (view === "sede") {
    const universidad = searchParams.get("u");
    const sede = searchParams.get("s");
    if (!universidad || !sede) {
      return NextResponse.json(
        { error: "Parámetros 'u' y 's' requeridos" },
        { status: 400 }
      );
    }

    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));
    const limit = 20;
    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where: {
          universidad,
          sede,
          deletedAt: null,
          suspended: false,
        },
        orderBy: { xp: "desc" },
        skip,
        take: limit,
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          xp: true,
          universityYear: true,
          causasGanadas: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      }),
      prisma.user.count({
        where: {
          universidad,
          sede,
          deletedAt: null,
          suspended: false,
        },
      }),
    ]);

    const items = users.map((u, i) => ({
      rank: skip + i + 1,
      id: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      avatarUrl: u.avatarUrl,
      xp: u.xp,
      universityYear: u.universityYear,
      causasGanadas: u.causasGanadas,
      tier: u.leagueMembers[0]?.league.tier ?? null,
    }));

    return NextResponse.json({
      view: "sede",
      universidad,
      sede,
      items,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  }

  return NextResponse.json({ error: "Vista inválida" }, { status: 400 });
}
