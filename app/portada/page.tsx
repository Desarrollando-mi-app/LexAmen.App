import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds, getGradoInfo } from "@/lib/league";
import { calcularScoreAutor, type AutorStats } from "@/lib/diario-ranking";
import { noticiasVigentesWhere } from "@/lib/noticias-ttl";
import { PortadaClient } from "./portada-client";

export default async function PortadaPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);

  const { weekStart } = getCurrentWeekBounds();

  const [
    noticias,
    mejorObiter,
    mejorAnalisis,
    rankingMembers,
    eventos,
    sponsors,
    totalUsuarios,
    totalObiters,
    totalAnalisis,
    totalEnsayos,
    activosHoyGroups,
    expedienteActivoRaw,
    noticiasJuridicasRaw,
  ] = await Promise.all([
    prisma.heroSlide.findMany({
      where: {
        estado: "activo",
        fechaInicio: { lte: now },
        OR: [{ fechaFin: null }, { fechaFin: { gte: now } }],
        ubicaciones: { has: "portada" },
      },
      orderBy: { orden: "desc" },
      take: 3,
    }),
    prisma.obiterDictum.findFirst({
      where: {
        createdAt: { gte: sevenDaysAgo },
        apoyosCount: { gt: 0 },
      },
      orderBy: { apoyosCount: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true } },
      },
    }),
    prisma.analisisSentencia.findFirst({
      where: {
        isActive: true,
        isHidden: false,
        showInFeed: true,
        createdAt: { gte: sevenDaysAgo },
        apoyosCount: { gt: 0 },
      },
      orderBy: { apoyosCount: "desc" },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true } },
      },
    }),
    prisma.leagueMember.findMany({
      where: { league: { weekStart }, weeklyXp: { gt: 0 } },
      orderBy: { weeklyXp: "desc" },
      take: 5,
      include: {
        user: { select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true } },
      },
    }),
    prisma.eventoAcademico.findMany({
      where: {
        approvalStatus: "aprobado",
        fecha: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { fecha: "asc" },
      take: 4,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    prisma.sponsorBanner.findMany({
      where: {
        activo: true,
        fechaInicio: { lte: now },
        OR: [{ fechaFin: null }, { fechaFin: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
    }),
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.obiterDictum.count(),
    prisma.analisisSentencia.count({ where: { isActive: true } }),
    prisma.ensayo.count({ where: { isActive: true } }),
    prisma.xpLog.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: todayStart }, amount: { gt: 0 } },
    }),
    prisma.expediente.findFirst({
      where: { estado: "abierto", aprobado: true },
      orderBy: { fechaApertura: "desc" },
      select: {
        id: true,
        numero: true,
        titulo: true,
        pregunta: true,
        fechaCierre: true,
        rama: true,
        _count: { select: { argumentos: true } },
      },
    }),
    prisma.noticiaJuridica.findMany({
      where: noticiasVigentesWhere(),
      orderBy: { fechaAprobacion: "desc" },
      take: 4,
      select: {
        id: true,
        titulo: true,
        resumen: true,
        urlFuente: true,
        fuente: true,
        fuenteNombre: true,
        destacada: true,
        fechaAprobacion: true,
      },
    }),
  ]);

  const usuariosActivosHoy = activosHoyGroups.length;

  // ─── Top Autores del Mes (lightweight query) ───
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const dateFilterAutores = { gte: thirtyDaysAgo };

  const [
    obiterGroupsAutores,
    miniAnalisisGroupsAutores,
    analisisCompletoGroupsAutores,
    ensayoGroupsAutores,
    argExpGroupsAutores,
    obiterApoyosAutores,
    analisisApoyosAutores,
    ensayoApoyosAutores,
    obiterCitasAutores,
    analisisCitasAutores,
    ensayoCitasAutores,
  ] = await Promise.all([
    prisma.obiterDictum.groupBy({ by: ["userId"], _count: { id: true }, where: { createdAt: dateFilterAutores } }),
    prisma.analisisSentencia.groupBy({ by: ["userId"], _count: { id: true }, where: { isActive: true, formato: "mini", createdAt: dateFilterAutores } }),
    prisma.analisisSentencia.groupBy({ by: ["userId"], _count: { id: true }, where: { isActive: true, formato: "completo", createdAt: dateFilterAutores } }),
    prisma.ensayo.groupBy({ by: ["userId"], _count: { id: true }, where: { isActive: true, createdAt: dateFilterAutores } }),
    prisma.expedienteArgumento.groupBy({ by: ["userId"], _count: { id: true }, where: { createdAt: dateFilterAutores } }),
    prisma.obiterDictum.groupBy({ by: ["userId"], _sum: { apoyosCount: true }, where: { createdAt: dateFilterAutores } }),
    prisma.analisisSentencia.groupBy({ by: ["userId"], _sum: { apoyosCount: true }, where: { isActive: true, createdAt: dateFilterAutores } }),
    prisma.ensayo.groupBy({ by: ["userId"], _sum: { apoyosCount: true }, where: { isActive: true, createdAt: dateFilterAutores } }),
    prisma.obiterDictum.groupBy({ by: ["userId"], _sum: { citasCount: true }, where: { createdAt: dateFilterAutores } }),
    prisma.analisisSentencia.groupBy({ by: ["userId"], _sum: { citasCount: true }, where: { isActive: true, createdAt: dateFilterAutores } }),
    prisma.ensayo.groupBy({ by: ["userId"], _sum: { citasCount: true }, where: { isActive: true, createdAt: dateFilterAutores } }),
  ]);

  const autorStatsMap = new Map<string, AutorStats>();
  function getAutorStats(userId: string): AutorStats {
    if (!autorStatsMap.has(userId)) {
      autorStatsMap.set(userId, { obiters: 0, miniAnalisis: 0, analisisCompletos: 0, ensayos: 0, argumentosExpediente: 0, debatesParticipados: 0, debatesGanados: 0, apoyosRecibidos: 0, citasRecibidas: 0, mejorAnalisisSemana: 0, mejorAlegatoExpediente: 0, reviewsCompletados: 0 });
    }
    return autorStatsMap.get(userId)!;
  }

  for (const g of obiterGroupsAutores) getAutorStats(g.userId).obiters = g._count.id;
  for (const g of miniAnalisisGroupsAutores) getAutorStats(g.userId).miniAnalisis = g._count.id;
  for (const g of analisisCompletoGroupsAutores) getAutorStats(g.userId).analisisCompletos = g._count.id;
  for (const g of ensayoGroupsAutores) getAutorStats(g.userId).ensayos = g._count.id;
  for (const g of argExpGroupsAutores) getAutorStats(g.userId).argumentosExpediente = g._count.id;
  for (const g of obiterApoyosAutores) getAutorStats(g.userId).apoyosRecibidos += g._sum.apoyosCount ?? 0;
  for (const g of analisisApoyosAutores) getAutorStats(g.userId).apoyosRecibidos += g._sum.apoyosCount ?? 0;
  for (const g of ensayoApoyosAutores) getAutorStats(g.userId).apoyosRecibidos += g._sum.apoyosCount ?? 0;
  for (const g of obiterCitasAutores) getAutorStats(g.userId).citasRecibidas += g._sum.citasCount ?? 0;
  for (const g of analisisCitasAutores) getAutorStats(g.userId).citasRecibidas += g._sum.citasCount ?? 0;
  for (const g of ensayoCitasAutores) getAutorStats(g.userId).citasRecibidas += g._sum.citasCount ?? 0;

  const autorScores: { userId: string; score: number }[] = [];
  for (const [userId, stats] of Array.from(autorStatsMap.entries())) {
    const score = calcularScoreAutor(stats);
    if (score > 0) autorScores.push({ userId, score });
  }
  autorScores.sort((a, b) => b.score - a.score);
  const top3AutorIds = autorScores.slice(0, 3);

  const top3AutorUsers = top3AutorIds.length > 0
    ? await prisma.user.findMany({
        where: { id: { in: top3AutorIds.map((a) => a.userId) }, deletedAt: null },
        select: { id: true, firstName: true, lastName: true, avatarUrl: true, grado: true },
      })
    : [];

  const top3AutorMap = new Map(top3AutorUsers.map((u) => [u.id, u]));
  const topAutores = top3AutorIds
    .map((a) => {
      const u = top3AutorMap.get(a.userId);
      if (!u) return null;
      const gi = getGradoInfo(u.grado);
      return {
        userId: u.id,
        firstName: u.firstName,
        lastName: u.lastName,
        avatarUrl: u.avatarUrl,
        score: a.score,
        gradoEmoji: gi.emoji,
        grado: u.grado,
      };
    })
    .filter((x): x is NonNullable<typeof x> => x !== null);

  // User ranking position if logged in
  let miPosicion: number | undefined;
  let miXp: number | undefined;
  let userName: string | undefined;

  if (authUser) {
    const [u, myMember] = await Promise.all([
      prisma.user.findUnique({ where: { id: authUser.id }, select: { firstName: true } }),
      prisma.leagueMember.findFirst({
        where: { userId: authUser.id, league: { weekStart } },
        select: { weeklyXp: true },
      }),
    ]);
    userName = u?.firstName ?? undefined;
    if (myMember) {
      miXp = myMember.weeklyXp;
      const above = await prisma.leagueMember.count({
        where: { league: { weekStart }, weeklyXp: { gt: myMember.weeklyXp } },
      });
      miPosicion = above + 1;
    }
  }

  // Serialize
  const data = {
    noticias: noticias.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      imagenUrl: n.imagenUrl,
      imagenPosicion: n.imagenPosicion,
      overlayOpacidad: n.overlayOpacidad,
      titulo: n.titulo,
      subtitulo: n.subtitulo,
      ctaTexto: n.ctaTexto,
      ctaUrl: n.ctaUrl,
      ctaExterno: n.ctaExterno,
    })),
    destacados: {
      mejorObiter: mejorObiter
        ? {
            id: mejorObiter.id,
            content: mejorObiter.content,
            tipo: mejorObiter.tipo,
            apoyos: mejorObiter.apoyosCount,
            citasCount: mejorObiter.citasCount,
            createdAt: mejorObiter.createdAt.toISOString(),
            autor: mejorObiter.user,
          }
        : null,
      mejorAnalisis: mejorAnalisis
        ? {
            id: mejorAnalisis.id,
            titulo: mejorAnalisis.titulo,
            resumen: mejorAnalisis.resumen,
            materia: mejorAnalisis.materia,
            apoyos: mejorAnalisis.apoyosCount,
            createdAt: mejorAnalisis.createdAt.toISOString(),
            autor: mejorAnalisis.user,
          }
        : null,
    },
    ranking: {
      top: rankingMembers.map((m) => ({
        userId: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarUrl: m.user.avatarUrl,
        weeklyXp: m.weeklyXp,
        universidad: m.user.universidad,
      })),
      miPosicion,
      miXp,
    },
    topAutores,
    eventos: eventos.map((e) => ({
      id: e.id,
      titulo: e.titulo,
      descripcion: e.descripcion,
      organizador: e.organizador,
      fecha: e.fecha.toISOString(),
      fechaFin: e.fechaFin?.toISOString() ?? null,
      hora: e.hora,
      formato: e.formato,
      lugar: e.lugar,
      costo: e.costo,
      materias: e.materias,
      creador: `${e.user.firstName} ${e.user.lastName}`,
    })),
    sponsors: sponsors.map((s) => ({
      id: s.id,
      nombre: s.nombre,
      titulo: s.titulo,
      descripcion: s.descripcion,
      imagenUrl: s.imagenUrl,
      linkUrl: s.linkUrl,
      posicion: s.posicion,
    })),
    stats: {
      totalUsuarios,
      totalPublicaciones: totalObiters + totalAnalisis + totalEnsayos,
      usuariosActivosHoy,
    },
    expedienteActivo: expedienteActivoRaw
      ? {
          id: expedienteActivoRaw.id,
          numero: expedienteActivoRaw.numero,
          titulo: expedienteActivoRaw.titulo,
          pregunta: expedienteActivoRaw.pregunta,
          fechaCierre: expedienteActivoRaw.fechaCierre.toISOString(),
          rama: expedienteActivoRaw.rama,
          argumentosCount: expedienteActivoRaw._count.argumentos,
        }
      : null,
    noticiasJuridicas: noticiasJuridicasRaw.map((n) => ({
      id: n.id,
      titulo: n.titulo,
      resumen: n.resumen,
      urlFuente: n.urlFuente,
      fuente: n.fuente,
      fuenteNombre: n.fuenteNombre,
      destacada: n.destacada,
      fechaAprobacion: n.fechaAprobacion?.toISOString() ?? null,
    })),
    isLoggedIn: !!authUser,
    userName,
  };

  return <PortadaClient data={data} />;
}
