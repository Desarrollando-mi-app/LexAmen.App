import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getCurrentWeekBounds } from "@/lib/league";
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
      where: { estado: "aprobada" },
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
