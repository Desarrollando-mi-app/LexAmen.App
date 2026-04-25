import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
import {
  calcularScoreAutor,
  isRankingTipo,
  rankingIncluyeBucket,
  type AutorStats,
  type RankingTipo,
} from "@/lib/diario-ranking";
import { getGradoInfo } from "@/lib/league";

// ─── GET /api/diario/ranking-autores ────────────────────────
// Public. If authed, includes miPosicion.

export async function GET(req: NextRequest) {
  const url = req.nextUrl;
  const periodo = url.searchParams.get("periodo") ?? "mes";
  const rama = url.searchParams.get("rama") ?? undefined;
  const tipoRaw = url.searchParams.get("tipo");
  const tipo: RankingTipo = isRankingTipo(tipoRaw) ? tipoRaw : "TODOS";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get("limit") ?? "20")));

  // Date cutoff
  let dateCutoff: Date | null = null;
  if (periodo === "semana") {
    dateCutoff = new Date();
    dateCutoff.setDate(dateCutoff.getDate() - 7);
  } else if (periodo === "mes") {
    dateCutoff = new Date();
    dateCutoff.setDate(dateCutoff.getDate() - 30);
  }
  // "todo" => null

  const dateFilter = dateCutoff ? { gte: dateCutoff } : undefined;

  // Auth (optional)
  let authUserId: string | null = null;
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    authUserId = user?.id ?? null;
  } catch {
    // not authed, that's fine
  }

  // ─── Step 1: Collect all user IDs who have published anything ───
  // Run all counting queries in parallel using groupBy for efficiency.
  // El parámetro `tipo` permite restringir el ranking a un único tipo de
  // publicación; los buckets que no aplican se cortocircuitan a [] para
  // ahorrar queries y dejar el score en 0 para esa categoría.

  const ramaFilter = rama ? { materia: rama } : {};
  const ramaFilterDebate = rama ? { rama } : {};

  const incObiter = rankingIncluyeBucket(tipo, "obiter");
  const incAnalisis = rankingIncluyeBucket(tipo, "analisis");
  const incEnsayo = rankingIncluyeBucket(tipo, "ensayo");
  const incArgumento = rankingIncluyeBucket(tipo, "argumento");
  const incDebate = rankingIncluyeBucket(tipo, "debate");
  const incReview = rankingIncluyeBucket(tipo, "review");

  const empty = <T,>(): Promise<T[]> => Promise.resolve([]);

  const [
    obiterGroups,
    miniAnalisisGroups,
    analisisCompletoGroups,
    ensayoGroups,
    argExpedienteGroups,
    debatesAutor1Groups,
    debatesAutor2Groups,
    , // debatesGanadosAutor1 (unused, wins computed differently)
    , // debatesGanadosAutor2 (unused, wins computed differently)
    // Apoyos/citas aggregations
    obiterApoyos,
    analisisApoyos,
    ensayoApoyos,
    obiterCitas,
    analisisCitas,
    ensayoCitas,
    // Awards
    mejorAnalisisSemanaRaw,
    mejorAlegatoExpedienteRaw,
    // Reviews
    reviewGroups,
  ] = await Promise.all([
    // obiters count by user
    incObiter
      ? prisma.obiterDictum.groupBy({
          by: ["userId"],
          _count: { id: true },
          where: { createdAt: dateFilter, ...(rama ? { materia: rama } : {}) },
        })
      : empty<{ userId: string; _count: { id: number } }>(),
    // mini analisis count by user
    incAnalisis
      ? prisma.analisisSentencia.groupBy({
          by: ["userId"],
          _count: { id: true },
          where: { isActive: true, formato: "mini", createdAt: dateFilter, ...ramaFilter },
        })
      : empty<{ userId: string; _count: { id: number } }>(),
    // completo analisis count by user
    incAnalisis
      ? prisma.analisisSentencia.groupBy({
          by: ["userId"],
          _count: { id: true },
          where: { isActive: true, formato: "completo", createdAt: dateFilter, ...ramaFilter },
        })
      : empty<{ userId: string; _count: { id: number } }>(),
    // ensayos count by user
    incEnsayo
      ? prisma.ensayo.groupBy({
          by: ["userId"],
          _count: { id: true },
          where: { isActive: true, createdAt: dateFilter, ...(rama ? { materia: rama } : {}) },
        })
      : empty<{ userId: string; _count: { id: number } }>(),
    // expediente argumentos count by user
    incArgumento
      ? prisma.expedienteArgumento.groupBy({
          by: ["userId"],
          _count: { id: true },
          where: { createdAt: dateFilter, ...(rama ? { expediente: { rama } } : {}) },
        })
      : empty<{ userId: string; _count: { id: number } }>(),
    // debates as autor1
    incDebate
      ? prisma.debateJuridico.groupBy({
          by: ["autor1Id"],
          _count: { id: true },
          where: { createdAt: dateFilter, ...ramaFilterDebate },
        })
      : empty<{ autor1Id: string; _count: { id: number } }>(),
    // debates as autor2
    incDebate
      ? prisma.debateJuridico.groupBy({
          by: ["autor2Id"],
          _count: { id: true },
          where: { autor2Id: { not: null }, createdAt: dateFilter, ...ramaFilterDebate },
        })
      : empty<{ autor2Id: string | null; _count: { id: number } }>(),
    // debates ganados as autor1 (placeholder, ganados se recalculan abajo)
    empty<unknown>(),
    // debates ganados as autor2 (placeholder)
    empty<unknown>(),
    // apoyos sum for obiters
    incObiter
      ? prisma.obiterDictum.groupBy({
          by: ["userId"],
          _sum: { apoyosCount: true },
          where: { createdAt: dateFilter, ...(rama ? { materia: rama } : {}) },
        })
      : empty<{ userId: string; _sum: { apoyosCount: number | null } }>(),
    // apoyos sum for analisis
    incAnalisis
      ? prisma.analisisSentencia.groupBy({
          by: ["userId"],
          _sum: { apoyosCount: true },
          where: { isActive: true, createdAt: dateFilter, ...ramaFilter },
        })
      : empty<{ userId: string; _sum: { apoyosCount: number | null } }>(),
    // apoyos sum for ensayos
    incEnsayo
      ? prisma.ensayo.groupBy({
          by: ["userId"],
          _sum: { apoyosCount: true },
          where: { isActive: true, createdAt: dateFilter, ...(rama ? { materia: rama } : {}) },
        })
      : empty<{ userId: string; _sum: { apoyosCount: number | null } }>(),
    // citas sum for obiters
    incObiter
      ? prisma.obiterDictum.groupBy({
          by: ["userId"],
          _sum: { citasCount: true },
          where: { createdAt: dateFilter, ...(rama ? { materia: rama } : {}) },
        })
      : empty<{ userId: string; _sum: { citasCount: number | null } }>(),
    // citas sum for analisis
    incAnalisis
      ? prisma.analisisSentencia.groupBy({
          by: ["userId"],
          _sum: { citasCount: true },
          where: { isActive: true, createdAt: dateFilter, ...ramaFilter },
        })
      : empty<{ userId: string; _sum: { citasCount: number | null } }>(),
    // citas sum for ensayos
    incEnsayo
      ? prisma.ensayo.groupBy({
          by: ["userId"],
          _sum: { citasCount: true },
          where: { isActive: true, createdAt: dateFilter, ...(rama ? { materia: rama } : {}) },
        })
      : empty<{ userId: string; _sum: { citasCount: number | null } }>(),
    // mejor analisis de la semana (FalloDeLaSemana with mejorAnalisisId)
    incAnalisis
      ? prisma.falloDeLaSemana.findMany({
          where: { mejorAnalisisId: { not: null }, ...(dateFilter ? { createdAt: dateFilter } : {}) },
          select: { mejorAnalisisId: true },
        })
      : empty<{ mejorAnalisisId: string | null }>(),
    // mejor alegato expediente
    incArgumento
      ? prisma.expediente.findMany({
          where: { mejorArgumentoId: { not: null }, ...(dateFilter ? { fechaApertura: dateFilter } : {}), ...(rama ? { rama } : {}) },
          select: { mejorArgumentoId: true },
        })
      : empty<{ mejorArgumentoId: string | null }>(),
    // reviews completados — no aplica al filtrar por tipo de publicación
    incReview
      ? prisma.peerReview.groupBy({
          by: ["reviewerId"],
          _count: { id: true },
          where: { estado: "completado", ...(dateFilter ? { completedAt: dateFilter } : {}) },
        })
      : empty<{ reviewerId: string; _count: { id: number } }>(),
  ]);

  // ─── Step 2: Resolve mejorAnalisis/mejorAlegato to userId ───

  // Get userIds for mejorAnalisis winners
  const mejorAnalisisIds = mejorAnalisisSemanaRaw
    .map((f) => f.mejorAnalisisId)
    .filter((id): id is string => id !== null);

  const mejorAlegatoIds = mejorAlegatoExpedienteRaw
    .map((e) => e.mejorArgumentoId)
    .filter((id): id is string => id !== null);

  const [mejorAnalisisUsers, mejorAlegatoUsers] = await Promise.all([
    mejorAnalisisIds.length > 0
      ? prisma.analisisSentencia.findMany({
          where: { id: { in: mejorAnalisisIds } },
          select: { userId: true },
        })
      : Promise.resolve([]),
    mejorAlegatoIds.length > 0
      ? prisma.expedienteArgumento.findMany({
          where: { id: { in: mejorAlegatoIds } },
          select: { userId: true },
        })
      : Promise.resolve([]),
  ]);

  // Also need to resolve debates ganados properly: need actual win check
  // debatesGanadosAutor1 only counted where votosAutor1 > 0, need votosAutor1 > votosAutor2
  // Fetch actual closed debates to check winners properly. Si el filtro
  // por tipo excluye debates, se cortocircuita a [] para no pegarle a la
  // DB innecesariamente.
  const closedDebates = incDebate
    ? await prisma.debateJuridico.findMany({
        where: { estado: "cerrado", createdAt: dateFilter, ...ramaFilterDebate },
        select: { autor1Id: true, autor2Id: true, votosAutor1: true, votosAutor2: true },
      })
    : [];

  // ─── Step 3: Build user stats map ───

  const userStatsMap = new Map<string, AutorStats>();

  function getStats(userId: string): AutorStats {
    if (!userStatsMap.has(userId)) {
      userStatsMap.set(userId, {
        obiters: 0,
        miniAnalisis: 0,
        analisisCompletos: 0,
        ensayos: 0,
        investigaciones: 0,
        argumentosExpediente: 0,
        debatesParticipados: 0,
        debatesGanados: 0,
        apoyosRecibidos: 0,
        citasRecibidas: 0,
        mejorAnalisisSemana: 0,
        mejorAlegatoExpediente: 0,
        reviewsCompletados: 0,
      });
    }
    return userStatsMap.get(userId)!;
  }

  // Obiters
  for (const g of obiterGroups) {
    getStats(g.userId).obiters = g._count.id;
  }
  // Mini analisis
  for (const g of miniAnalisisGroups) {
    getStats(g.userId).miniAnalisis = g._count.id;
  }
  // Analisis completos
  for (const g of analisisCompletoGroups) {
    getStats(g.userId).analisisCompletos = g._count.id;
  }
  // Ensayos
  for (const g of ensayoGroups) {
    getStats(g.userId).ensayos = g._count.id;
  }
  // Argumentos expediente
  for (const g of argExpedienteGroups) {
    getStats(g.userId).argumentosExpediente = g._count.id;
  }
  // Debates participados
  for (const g of debatesAutor1Groups) {
    getStats(g.autor1Id).debatesParticipados += g._count.id;
  }
  for (const g of debatesAutor2Groups) {
    if (g.autor2Id) {
      getStats(g.autor2Id).debatesParticipados += g._count.id;
    }
  }
  // Debates ganados (proper check)
  for (const d of closedDebates) {
    if (d.votosAutor1 > d.votosAutor2) {
      getStats(d.autor1Id).debatesGanados += 1;
    } else if (d.votosAutor2 > d.votosAutor1 && d.autor2Id) {
      getStats(d.autor2Id).debatesGanados += 1;
    }
  }
  // Apoyos
  for (const g of obiterApoyos) {
    getStats(g.userId).apoyosRecibidos += g._sum.apoyosCount ?? 0;
  }
  for (const g of analisisApoyos) {
    getStats(g.userId).apoyosRecibidos += g._sum.apoyosCount ?? 0;
  }
  for (const g of ensayoApoyos) {
    getStats(g.userId).apoyosRecibidos += g._sum.apoyosCount ?? 0;
  }
  // Citas
  for (const g of obiterCitas) {
    getStats(g.userId).citasRecibidas += g._sum.citasCount ?? 0;
  }
  for (const g of analisisCitas) {
    getStats(g.userId).citasRecibidas += g._sum.citasCount ?? 0;
  }
  for (const g of ensayoCitas) {
    getStats(g.userId).citasRecibidas += g._sum.citasCount ?? 0;
  }
  // Mejor analisis semana
  for (const u of mejorAnalisisUsers) {
    getStats(u.userId).mejorAnalisisSemana += 1;
  }
  // Mejor alegato expediente
  for (const u of mejorAlegatoUsers) {
    getStats(u.userId).mejorAlegatoExpediente += 1;
  }
  // Reviews
  for (const g of reviewGroups) {
    getStats(g.reviewerId).reviewsCompletados = g._count.id;
  }

  // ─── Step 4: Compute scores & build ranking ───

  const allUserIds = Array.from(userStatsMap.keys());

  // Fetch user info in bulk
  const users = await prisma.user.findMany({
    where: { id: { in: allUserIds }, deletedAt: null },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      grado: true,
      xp: true,
    },
  });

  const userMap = new Map(users.map((u) => [u.id, u]));

  type RankingEntry = {
    userId: string;
    firstName: string;
    lastName: string;
    avatarUrl: string | null;
    grado: number;
    gradoEmoji: string;
    gradoNombre: string;
    score: number;
    desglose: AutorStats;
    totalPublicaciones: number;
  };

  const ranking: RankingEntry[] = [];

  for (const [userId, stats] of Array.from(userStatsMap.entries())) {
    const user = userMap.get(userId);
    if (!user) continue;

    const score = calcularScoreAutor(stats);
    if (score <= 0) continue;

    const gradoInfo = getGradoInfo(user.grado);
    const totalPublicaciones =
      stats.obiters +
      stats.miniAnalisis +
      stats.analisisCompletos +
      stats.ensayos +
      stats.investigaciones +
      stats.argumentosExpediente;

    ranking.push({
      userId: user.id,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      grado: user.grado,
      gradoEmoji: gradoInfo.emoji,
      gradoNombre: gradoInfo.nombre,
      score,
      desglose: stats,
      totalPublicaciones,
    });
  }

  // Sort by score DESC
  ranking.sort((a, b) => b.score - a.score);

  const total = ranking.length;

  // My position
  let miPosicion: number | undefined;
  if (authUserId) {
    const idx = ranking.findIndex((r) => r.userId === authUserId);
    if (idx >= 0) {
      miPosicion = idx + 1;
    }
  }

  // Paginate
  const offset = (page - 1) * limit;
  const paginatedRanking = ranking.slice(offset, offset + limit);

  return NextResponse.json({
    ranking: paginatedRanking,
    total,
    miPosicion,
    periodo,
  });
}
