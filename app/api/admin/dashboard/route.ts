import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Current week boundaries (Monday to Sunday)
  const dayOfWeek = now.getDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const weekStart = new Date(now);
  weekStart.setDate(now.getDate() + mondayOffset);
  weekStart.setHours(0, 0, 0, 0);

  const [
    // ── Usuarios ──
    totalUsers,
    usersHoy,
    usersSemana,
    usersMes,
    activosHoyRaw,
    activosSemanaRaw,
    // ── Planes ──
    planGratis,
    planEstudiante,
    planPro,
    // ── Contenido Estudio ──
    flashcards,
    mcq,
    vf,
    definiciones,
    fillBlank,
    errorId,
    orderSeq,
    matchCol,
    casoPractico,
    dictado,
    timeline,
    // ── Publicaciones ──
    obiters,
    analisisMini,
    analisisCompleto,
    ensayos,
    argumentosExpediente,
    debates,
    // ── Liga ──
    ligasActivas,
    topGradoUser,
    gradoPromedioRaw,
    // ── Pendientes ──
    noticiasPendientes,
    propuestasExpediente,
    debatesPorAvanzar,
    // ── Charts ──
    registrosPorDiaRaw,
    xpPorDiaRaw,
    // ── Actividad reciente ──
    recentXpLogs,
    recentUsers,
  ] = await Promise.all([
    // ── Usuarios ──
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: todayStart }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: sevenDaysAgo }, deletedAt: null } }),
    prisma.user.count({ where: { createdAt: { gte: thirtyDaysAgo }, deletedAt: null } }),
    // Activos hoy: any XpLog today
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count
      FROM "XpLog"
      WHERE "createdAt" >= ${todayStart}
    `,
    // Activos semana
    prisma.$queryRaw<{ count: bigint }[]>`
      SELECT COUNT(DISTINCT "userId")::bigint as count
      FROM "XpLog"
      WHERE "createdAt" >= ${sevenDaysAgo}
    `,
    // ── Planes ──
    prisma.user.count({ where: { plan: "FREE", deletedAt: null } }),
    prisma.user.count({ where: { plan: "PREMIUM_MONTHLY", deletedAt: null } }),
    prisma.user.count({ where: { plan: "PREMIUM_ANNUAL", deletedAt: null } }),
    // ── Contenido Estudio ──
    prisma.flashcard.count(),
    prisma.mCQ.count(),
    prisma.trueFalse.count(),
    prisma.definicion.count(),
    prisma.fillBlank.count(),
    prisma.errorIdentification.count(),
    prisma.orderSequence.count(),
    prisma.matchColumns.count(),
    prisma.casoPractico.count(),
    prisma.dictadoJuridico.count(),
    prisma.timeline.count(),
    // ── Publicaciones ──
    prisma.obiterDictum.count(),
    prisma.analisisSentencia.count({ where: { formato: "mini" } }),
    prisma.analisisSentencia.count({ where: { formato: "completo" } }),
    prisma.ensayo.count(),
    prisma.expedienteArgumento.count(),
    prisma.debateJuridico.count(),
    // ── Liga ──
    prisma.league.count({ where: { weekEnd: { gte: now } } }),
    prisma.user.findFirst({
      where: { deletedAt: null },
      orderBy: { grado: "desc" },
      select: { id: true, firstName: true, lastName: true, grado: true },
    }),
    prisma.$queryRaw<{ avg: number | null }[]>`
      SELECT AVG("grado")::float as avg
      FROM "User"
      WHERE "deletedAt" IS NULL AND "grado" > 1
    `,
    // ── Pendientes ──
    prisma.noticiaJuridica.count({ where: { estado: "pendiente" } }),
    prisma.expediente.count({ where: { aprobado: false } }),
    prisma.debateJuridico.count({
      where: { estado: { in: ["buscando_oponente", "argumentando"] } },
    }),
    // ── Charts: registros por dia (last 30 days) ──
    prisma.$queryRaw<{ date: string; count: bigint }[]>`
      SELECT DATE("createdAt") as date, COUNT(*)::bigint as count
      FROM "User"
      WHERE "createdAt" >= ${thirtyDaysAgo}
        AND "deletedAt" IS NULL
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // ── Charts: xp por dia (last 30 days) ──
    prisma.$queryRaw<{ date: string; total: bigint }[]>`
      SELECT DATE("createdAt") as date, SUM("amount")::bigint as total
      FROM "XpLog"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `,
    // ── Actividad reciente: XP logs ──
    prisma.xpLog.findMany({
      orderBy: { createdAt: "desc" },
      take: 15,
      include: { user: { select: { firstName: true, lastName: true } } },
    }),
    // ── Actividad reciente: new users ──
    prisma.user.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, firstName: true, lastName: true, createdAt: true },
    }),
  ]);

  // ── Fill missing days for charts ──
  const regMap = new Map<string, number>();
  for (const row of registrosPorDiaRaw) {
    regMap.set(new Date(row.date).toISOString().slice(0, 10), Number(row.count));
  }

  const xpMap = new Map<string, number>();
  for (const row of xpPorDiaRaw) {
    xpMap.set(new Date(row.date).toISOString().slice(0, 10), Number(row.total));
  }

  const registrosPorDia: { fecha: string; count: number }[] = [];
  const xpPorDia: { fecha: string; total: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 24 * 60 * 60 * 1000);
    const key = d.toISOString().slice(0, 10);
    registrosPorDia.push({ fecha: key, count: regMap.get(key) ?? 0 });
    xpPorDia.push({ fecha: key, total: xpMap.get(key) ?? 0 });
  }

  // ── Merge actividad reciente ──
  const actividadReciente = [
    ...recentXpLogs.map((x) => ({
      tipo: "xp" as const,
      descripcion: `+${x.amount} XP (${x.category}${x.detalle ? ` - ${x.detalle}` : ""})`,
      userName: `${x.user.firstName} ${x.user.lastName}`,
      createdAt: x.createdAt.toISOString(),
    })),
    ...recentUsers.map((u) => ({
      tipo: "registro" as const,
      descripcion: "Nuevo registro",
      userName: `${u.firstName} ${u.lastName}`,
      createdAt: u.createdAt.toISOString(),
    })),
  ]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 20);

  const totalEstudio =
    flashcards + mcq + vf + definiciones + fillBlank + errorId +
    orderSeq + matchCol + casoPractico + dictado + timeline;

  const totalPublicaciones =
    obiters + analisisMini + analisisCompleto + ensayos +
    argumentosExpediente + debates;

  return NextResponse.json({
    usuarios: {
      total: totalUsers,
      hoy: usersHoy,
      semana: usersSemana,
      mes: usersMes,
      activosHoy: Number(activosHoyRaw[0]?.count ?? 0),
      activosSemana: Number(activosSemanaRaw[0]?.count ?? 0),
    },
    planes: {
      gratis: planGratis,
      estudiante: planEstudiante,
      pro: planPro,
    },
    contenido: {
      flashcards,
      mcq,
      vf,
      definiciones,
      fillBlank,
      errorId,
      orderSeq,
      matchCol,
      casoPractico,
      dictado,
      timeline,
      totalEstudio,
    },
    publicaciones: {
      obiters,
      analisisMini,
      analisisCompleto,
      ensayos,
      argumentosExpediente,
      debates,
      total: totalPublicaciones,
    },
    liga: {
      ligasActivas,
      gradoPromedio: Math.round(gradoPromedioRaw[0]?.avg ?? 1),
      topGrado: topGradoUser
        ? {
            userId: topGradoUser.id,
            nombre: `${topGradoUser.firstName} ${topGradoUser.lastName}`,
            grado: topGradoUser.grado,
          }
        : null,
    },
    pendientes: {
      noticiasPendientes,
      propuestasExpediente,
      debatesPorAvanzar,
    },
    registrosPorDia,
    xpPorDia,
    actividadReciente,
  });
}
