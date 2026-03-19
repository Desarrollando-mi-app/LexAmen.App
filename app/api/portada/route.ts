import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds, getGradoInfo } from "@/lib/league";

export const revalidate = 60;

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const now = new Date();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);

  const { weekStart } = getCurrentWeekBounds();

  // Run all queries in parallel
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
    expedienteActivoRaw,
    usuariosActivosHoy,
  ] = await Promise.all([
    // 1. Noticias (Hero Slides con ubicación "portada")
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

    // 2a. Mejor Obiter (más apoyos últimos 7 días)
    prisma.obiterDictum.findFirst({
      where: {
        createdAt: { gte: sevenDaysAgo },
        apoyosCount: { gt: 0 },
      },
      orderBy: { apoyosCount: "desc" },
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true },
        },
      },
    }),

    // 2b. Mejor Análisis (más apoyos últimos 7 días)
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
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true },
        },
      },
    }),

    // 3. Ranking semanal (top 5)
    prisma.leagueMember.findMany({
      where: {
        league: { weekStart },
        weeklyXp: { gt: 0 },
      },
      orderBy: { weeklyXp: "desc" },
      take: 5,
      include: {
        user: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, universidad: true, grado: true },
        },
      },
    }),

    // 4. Eventos próximos (7 días, aprobados)
    prisma.eventoAcademico.findMany({
      where: {
        approvalStatus: "aprobado",
        fecha: { gte: now, lte: sevenDaysFromNow },
      },
      orderBy: { fecha: "asc" },
      take: 4,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),

    // 5. Sponsors activos
    prisma.sponsorBanner.findMany({
      where: {
        activo: true,
        fechaInicio: { lte: now },
        OR: [{ fechaFin: null }, { fechaFin: { gte: now } }],
      },
      orderBy: { createdAt: "desc" },
    }),

    // 6. Stats de comunidad
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.obiterDictum.count(),
    prisma.analisisSentencia.count({ where: { isActive: true } }),
    prisma.ensayo.count({ where: { isActive: true } }),

    // Expediente Abierto activo
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

    // Usuarios activos hoy
    prisma.xpLog.groupBy({
      by: ["userId"],
      where: {
        createdAt: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        amount: { gt: 0 },
      },
    }).then((r) => r.length),
  ]);

  // Build ranking with user position if logged in
  const ranking = {
    top: rankingMembers.map((m) => {
      const gi = getGradoInfo(m.user.grado);
      return {
        userId: m.user.id,
        firstName: m.user.firstName,
        lastName: m.user.lastName,
        avatarUrl: m.user.avatarUrl,
        weeklyXp: m.weeklyXp,
        universidad: m.user.universidad,
        grado: m.user.grado,
        gradoEmoji: gi.emoji,
        gradoNombre: gi.nombre,
      };
    }),
    miPosicion: undefined as number | undefined,
    miXp: undefined as number | undefined,
  };

  // If logged in, find user's position
  if (authUser) {
    const myMember = await prisma.leagueMember.findFirst({
      where: { userId: authUser.id, league: { weekStart } },
      select: { weeklyXp: true },
    });
    if (myMember) {
      ranking.miXp = myMember.weeklyXp;
      const above = await prisma.leagueMember.count({
        where: {
          league: { weekStart },
          weeklyXp: { gt: myMember.weeklyXp },
        },
      });
      ranking.miPosicion = above + 1;
    }
  }

  // Destacados
  const destacados = {
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
  };

  // Serialized eventos
  const eventosSerializados = eventos.map((e) => ({
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
  }));

  // User info if logged in
  let userName: string | undefined;
  if (authUser) {
    const u = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { firstName: true },
    });
    userName = u?.firstName;
  }

  return NextResponse.json({
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
    destacados,
    ranking,
    eventos: eventosSerializados,
    sponsors,
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
    isLoggedIn: !!authUser,
    userName,
  });
}
