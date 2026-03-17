import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/sugerencias-contacto ──────────────────────────
// Returns suggested contacts based on university, study activity, and publications.

interface SugerenciaResult {
  id: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  universidad: string | null;
  razon: string;
  stats: { xp: number };
}

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const limit = Math.min(parseInt(searchParams.get("limit") || "5"), 10);

  // Get current user info
  const currentUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { universidad: true },
  });

  // Get IDs to exclude (colegas + pending requests + self)
  const excludeIds = await getExcludedIds(authUser.id);

  const sugerencias: SugerenciaResult[] = [];
  const usedIds = new Set<string>();

  // ── Strategy 1: Same university (up to 3) ──────────────────
  if (currentUser?.universidad) {
    const sameUni = await prisma.user.findMany({
      where: {
        universidad: currentUser.universidad,
        id: { notIn: Array.from(excludeIds) },
        suspended: false,
        deletedAt: null,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        universidad: true,
        xp: true,
      },
      orderBy: { xp: "desc" },
      take: 3,
    });

    for (const u of sameUni) {
      if (sugerencias.length >= limit) break;
      if (usedIds.has(u.id)) continue;
      usedIds.add(u.id);
      sugerencias.push({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        universidad: u.universidad,
        razon: "Misma universidad",
        stats: { xp: u.xp },
      });
    }
  }

  // ── Strategy 2: Active publishers (up to 2) ────────────────
  if (sugerencias.length < limit) {
    const allExclude = [...Array.from(excludeIds), ...Array.from(usedIds)];

    // Users with most publications (obiters + análisis + ensayos)
    const publishers = await prisma.user.findMany({
      where: {
        id: { notIn: allExclude },
        suspended: false,
        deletedAt: null,
        OR: [
          { obiters: { some: {} } },
          { analisisCreados: { some: {} } },
          { ensayosCreados: { some: {} } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        universidad: true,
        xp: true,
        _count: {
          select: {
            obiters: true,
            analisisCreados: true,
            ensayosCreados: true,
          },
        },
      },
      orderBy: { xp: "desc" },
      take: 4,
    });

    for (const u of publishers) {
      if (sugerencias.length >= limit) break;
      if (usedIds.has(u.id)) continue;
      usedIds.add(u.id);

      const totalPubs =
        u._count.obiters + u._count.analisisCreados + u._count.ensayosCreados;
      const razon =
        u._count.analisisCreados > 0
          ? `Publicó ${u._count.analisisCreados} análisis`
          : u._count.ensayosCreados > 0
            ? `Publicó ${u._count.ensayosCreados} ensayo${u._count.ensayosCreados > 1 ? "s" : ""}`
            : `${totalPubs} publicaciones`;

      sugerencias.push({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        universidad: u.universidad,
        razon,
        stats: { xp: u.xp },
      });
    }
  }

  // ── Strategy 3: Most active users as fallback ──────────────
  if (sugerencias.length < limit) {
    const allExclude = [...Array.from(excludeIds), ...Array.from(usedIds)];

    const activeUsers = await prisma.user.findMany({
      where: {
        id: { notIn: allExclude },
        suspended: false,
        deletedAt: null,
        xp: { gt: 0 },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        avatarUrl: true,
        universidad: true,
        xp: true,
      },
      orderBy: { xp: "desc" },
      take: limit - sugerencias.length,
    });

    for (const u of activeUsers) {
      if (sugerencias.length >= limit) break;
      if (usedIds.has(u.id)) continue;
      usedIds.add(u.id);
      sugerencias.push({
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        universidad: u.universidad,
        razon: `${u.xp} XP acumulados`,
        stats: { xp: u.xp },
      });
    }
  }

  return NextResponse.json({ sugerencias });
}

// ── Helper: get all IDs to exclude (colegas + pending + self) ──
async function getExcludedIds(userId: string): Promise<Set<string>> {
  const requests = await prisma.colegaRequest.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: { in: ["ACCEPTED", "PENDING"] },
    },
    select: { senderId: true, receiverId: true },
  });

  const ids = new Set<string>();
  ids.add(userId);
  for (const r of requests) {
    ids.add(r.senderId);
    ids.add(r.receiverId);
  }
  return ids;
}
