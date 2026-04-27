import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegaStatus, getColegas, getColegaCount } from "@/lib/colegas";
import { getUserTutorStats } from "@/lib/sala-utils";
import { getCurrentWeekBounds } from "@/lib/league";
import { computePercentile, getTogaTierByPercentile } from "@/lib/la-toga";
import { PerfilPublico } from "./perfil-publico";
import { PerfilEditorial } from "./perfil-publico-editorial";
import { PerfilModerno } from "./perfil-publico-moderno";

interface Props {
  params: { userId: string };
  searchParams: { variant?: string };
}

export default async function PerfilPage({ params, searchParams }: Props) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const isOwnProfile = params.userId === authUser.id;

  // Buscar usuario
  const [targetUser, colegaStatus, colegaCount, targetBadges, targetColegas, cvRequest, diarioPostCount, obiterStats, tutorStats, recentEvaluations, obitersRaw, analisisRaw, ensayosRaw, debatesRaw, columnasRaw] =
    await Promise.all([
      prisma.user.findUnique({
        where: { id: params.userId },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          sede: true,
          universityYear: true,
          avatarUrl: true,
          coverUrl: true,
          bio: true,
          cvAvailable: true,
          region: true,
          corte: true,
          xp: true,
          grado: true,
          causasGanadas: true,
          causasPerdidas: true,
          createdAt: true,
          etapaActual: true,
          anioIngreso: true,
          anioEgreso: true,
          anioJura: true,
          empleoActual: true,
          cargoActual: true,
          especialidades: true,
          intereses: true,
          linkedinUrl: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
          _count: {
            select: {
              flashcardProgress: true,
              mcqAttempts: true,
              trueFalseAttempts: true,
            },
          },
        },
      }),
      getColegaStatus(authUser.id, params.userId),
      getColegaCount(params.userId),
      prisma.userBadge.findMany({
        where: { userId: params.userId },
        select: { badge: true },
      }),
      getColegas(params.userId),
      // Check existing CV request from current user to target
      prisma.cvRequest.findUnique({
        where: {
          fromUserId_toUserId: {
            fromUserId: authUser.id,
            toUserId: params.userId,
          },
        },
        select: { id: true, status: true },
      }),
      prisma.diarioPost.count({
        where: { userId: params.userId },
      }),
      // Obiter Dictum stats: count, total citas received, total apoyos received
      prisma.obiterDictum.aggregate({
        where: { userId: params.userId },
        _count: { id: true },
        _sum: { citasCount: true, apoyosCount: true },
      }),
      // Ayudantía/tutor stats
      getUserTutorStats(params.userId),
      // Recent evaluations received
      prisma.ayudantiaEvaluacion.findMany({
        where: { evaluadoId: params.userId, comentario: { not: null } },
        orderBy: { createdAt: "desc" },
        take: 3,
        select: {
          rating: true,
          comentario: true,
          evaluador: { select: { firstName: true } },
        },
      }),
      // Publicaciones: los 4 tipos (ObiterDictum legacy, AnalisisSentencia, Ensayo, DebateJuridico)
      // Incluye respuestas (no filtramos parentObiterId) — mostramos toda
      // la actividad del autor con indicador "↩ a @handle" cuando aplica.
      prisma.obiterDictum.findMany({
        where: { userId: params.userId, archived: false },
        orderBy: { createdAt: "desc" },
        take: 30,
        select: {
          id: true,
          content: true,
          materia: true,
          tipo: true,
          createdAt: true,
          apoyosCount: true,
          citasCount: true,
          guardadosCount: true,
          parentObiterId: true,
          replyCount: true,
          parentObiter: {
            select: {
              id: true,
              user: { select: { firstName: true } },
            },
          },
        },
      }),
      prisma.analisisSentencia.findMany({
        where: { userId: params.userId, isActive: true, isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          titulo: true,
          resumen: true,
          tribunal: true,
          numeroRol: true,
          materia: true,
          formato: true,
          createdAt: true,
          apoyosCount: true,
          citasCount: true,
          viewsCount: true,
        },
      }),
      prisma.ensayo.findMany({
        where: { userId: params.userId, isActive: true, isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          titulo: true,
          resumen: true,
          materia: true,
          tipo: true,
          archivoFormato: true,
          createdAt: true,
          apoyosCount: true,
          citasCount: true,
          viewsCount: true,
        },
      }),
      prisma.debateJuridico.findMany({
        where: { OR: [{ autor1Id: params.userId }, { autor2Id: params.userId }] },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          titulo: true,
          descripcion: true,
          rama: true,
          estado: true,
          autor1Id: true,
          autor2Id: true,
          votosAutor1: true,
          votosAutor2: true,
          createdAt: true,
        },
      }),
      prisma.columnaJuridica.findMany({
        where: { userId: params.userId, isActive: true, isHidden: false },
        orderBy: { createdAt: "desc" },
        take: 20,
        select: {
          id: true,
          titulo: true,
          resumen: true,
          materia: true,
          createdAt: true,
          apoyosCount: true,
          citasCount: true,
          viewsCount: true,
        },
      }),
    ]);

  if (!targetUser) {
    notFound();
  }

  const tier = targetUser.leagueMembers[0]?.league.tier ?? null;

  // Compute current La Toga tier (weekly percentile-based)
  const { weekStart } = getCurrentWeekBounds();
  const [targetWeekMember, allWeeklyMembers] = await Promise.all([
    prisma.leagueMember.findFirst({
      where: { userId: params.userId, league: { weekStart } },
      select: { weeklyXp: true },
    }),
    prisma.leagueMember.findMany({
      where: { league: { weekStart } },
      select: { weeklyXp: true },
    }),
  ]);
  const targetWeeklyXp = targetWeekMember?.weeklyXp ?? 0;
  const togaPercentile = computePercentile(
    targetWeeklyXp,
    allWeeklyMembers.map((m) => m.weeklyXp)
  );
  const togaTier = getTogaTierByPercentile(togaPercentile);

  const totalCausas = targetUser.causasGanadas + targetUser.causasPerdidas;
  const winRate =
    totalCausas > 0
      ? Math.round((targetUser.causasGanadas / totalCausas) * 100)
      : 0;

  // ─── Áreas practicadas (radar) ─────────────────────────────────
  // Métrica: RATIO DE ACIERTO SUAVIZADO (Bayesiano) sobre los últimos 100
  // ejercicios realizados POR RAMA. Cada rama se evalúa con su propia
  // evidencia — actividad en Procesal no contamina el puntaje de Civil.
  //
  // Fuentes (todas con isCorrect + vínculo a Rama vía MCQ/TrueFalse):
  //   · UserMCQAttempt       → MCQ.rama
  //   · UserTrueFalseAttempt → TrueFalse.rama
  //   · CausaAnswer          → MCQ.rama  (causa individual)
  //   · CausaRoomAnswer      → MCQ.rama  (causa multiplayer)
  //
  // Suavizado: (correctas + 5) / (total + 10). Con 0 intentos la rama no
  // aparece; con 1-10 intentos el % converge desde 50% evitando falsos
  // máximos; con 100 intentos el resultado se acerca al ratio real.
  const RAMAS_ENUM = ["DERECHO_CIVIL", "DERECHO_PROCESAL_CIVIL", "DERECHO_ORGANICO"] as const;
  const RAMA_LABELS: Record<(typeof RAMAS_ENUM)[number], string> = {
    DERECHO_CIVIL: "Derecho Civil",
    DERECHO_PROCESAL_CIVIL: "Derecho Procesal Civil",
    DERECHO_ORGANICO: "Derecho Orgánico",
  };
  const BAYES_PRIOR_CORRECT = 5;
  const BAYES_PRIOR_TOTAL = 10;
  const WINDOW_PER_RAMA = 100;

  const especialidadesCalculadas = (
    await Promise.all(
      RAMAS_ENUM.map(async (rama) => {
        // Para cada rama, traemos hasta 100 intentos por fuente, mezclamos
        // en una misma lista ordenada por fecha desc, y nos quedamos con
        // los 100 más recientes (ya dentro de esta rama).
        const [mcq, tf, causa, causaRoom] = await Promise.all([
          prisma.userMCQAttempt.findMany({
            where: { userId: params.userId, mcq: { rama } },
            orderBy: { attemptedAt: "desc" },
            take: WINDOW_PER_RAMA,
            select: { isCorrect: true, attemptedAt: true },
          }),
          prisma.userTrueFalseAttempt.findMany({
            where: { userId: params.userId, trueFalse: { rama } },
            orderBy: { attemptedAt: "desc" },
            take: WINDOW_PER_RAMA,
            select: { isCorrect: true, attemptedAt: true },
          }),
          prisma.causaAnswer.findMany({
            where: {
              userId: params.userId,
              isCorrect: { not: null },
              mcq: { rama },
            },
            orderBy: { answeredAt: "desc" },
            take: WINDOW_PER_RAMA,
            select: { isCorrect: true, answeredAt: true },
          }),
          prisma.causaRoomAnswer.findMany({
            where: {
              userId: params.userId,
              isCorrect: { not: null },
              mcq: { rama },
            },
            orderBy: { answeredAt: "desc" },
            take: WINDOW_PER_RAMA,
            select: { isCorrect: true, answeredAt: true },
          }),
        ]);

        const merged: Array<{ isCorrect: boolean; at: Date }> = [
          ...mcq.map((a) => ({ isCorrect: a.isCorrect, at: a.attemptedAt })),
          ...tf.map((a) => ({ isCorrect: a.isCorrect, at: a.attemptedAt })),
          ...causa
            .filter((a) => a.isCorrect !== null)
            .map((a) => ({ isCorrect: a.isCorrect as boolean, at: a.answeredAt })),
          ...causaRoom
            .filter((a) => a.isCorrect !== null)
            .map((a) => ({ isCorrect: a.isCorrect as boolean, at: a.answeredAt })),
        ]
          .sort((a, b) => b.at.getTime() - a.at.getTime())
          .slice(0, WINDOW_PER_RAMA);

        const total = merged.length;
        const correct = merged.filter((a) => a.isCorrect).length;
        return { rama, total, correct };
      })
    )
  )
    .filter((r) => r.total > 0) // solo ramas efectivamente practicadas
    .map((r) => ({
      materia: RAMA_LABELS[r.rama],
      porcentaje: Math.round(
        ((r.correct + BAYES_PRIOR_CORRECT) / (r.total + BAYES_PRIOR_TOTAL)) * 100
      ),
    }))
    .sort((a, b) => b.porcentaje - a.porcentaje)
    .slice(0, 8);

  // Especialidades declaradas (self-reported) — parse User.especialidades JSON
  let especialidadesDeclaradas: string[] = [];
  if (targetUser.especialidades) {
    try {
      const parsed = JSON.parse(targetUser.especialidades);
      if (Array.isArray(parsed)) {
        especialidadesDeclaradas = parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      /* ignore malformed JSON */
    }
  }

  // ─── Trayectoria timeline ───────────────────────────────────
  // Combina hitos auto-derivados (anioIngreso/anioEgreso/anioJura/empleo)
  // del modelo User con hitos personalizados de UserHito.
  // Defensivo: si la tabla aún no existe en la DB (migración pendiente),
  // simplemente seguimos sin custom hitos en lugar de crashear el perfil.
  let customHitos: Array<{
    id: string;
    tipo: string;
    titulo: string;
    descripcion: string | null;
    institucion: string | null;
    fecha: Date;
    esActual: boolean;
  }> = [];
  try {
    customHitos = await prisma.userHito.findMany({
      where: { userId: params.userId },
      orderBy: { fecha: "desc" },
    });
  } catch (err) {
    console.warn("[perfil] UserHito query failed (migración pendiente?):", err);
  }

  const trayectoria: Array<{
    id?: string;
    isCustom?: boolean;
    tipo: string;
    anio: number;
    detalle?: string;
    institucion?: string;
    descripcion?: string;
    esActual?: boolean;
    fechaIso?: string;
  }> = [];

  // Auto-derivados (no editables inline; el usuario los edita en /perfil/configuracion).
  if (targetUser.anioIngreso) {
    trayectoria.push({ tipo: "ingreso", anio: targetUser.anioIngreso, detalle: targetUser.universidad ?? undefined });
  }
  if (targetUser.anioEgreso) {
    trayectoria.push({ tipo: "egreso", anio: targetUser.anioEgreso });
  }
  if (targetUser.anioJura) {
    trayectoria.push({ tipo: "jura", anio: targetUser.anioJura });
  }
  if (targetUser.empleoActual) {
    trayectoria.push({
      tipo: "empleo",
      anio: new Date().getFullYear(),
      detalle: `${targetUser.empleoActual}${targetUser.cargoActual ? ` — ${targetUser.cargoActual}` : ""}`,
    });
  }

  // Hitos personalizados — editables/eliminables.
  for (const h of customHitos) {
    trayectoria.push({
      id: h.id,
      isCustom: true,
      tipo: h.tipo,
      anio: h.fecha.getFullYear(),
      detalle: h.titulo,
      institucion: h.institucion ?? undefined,
      descripcion: h.descripcion ?? undefined,
      esActual: h.esActual,
      fechaIso: h.fecha.toISOString(),
    });
  }

  // Ordenar por año desc (los hitos esActual van primero dentro del mismo año).
  trayectoria.sort((a, b) => {
    if (a.anio !== b.anio) return b.anio - a.anio;
    if (a.esActual && !b.esActual) return -1;
    if (!a.esActual && b.esActual) return 1;
    return 0;
  });

  // Top badges: earned, sorted by tier priority
  const TIER_PRIORITY: Record<string, number> = { unique: 0, special: 1, gold: 2, silver: 3, bronze: 4 };
  const earnedSlugs = new Set(targetBadges.map((b) => b.badge));
  const { BADGE_RULES } = await import("@/lib/badge-constants");
  const topBadges = BADGE_RULES
    .filter((b) => earnedSlugs.has(b.slug))
    .sort((a, b) => (TIER_PRIORITY[a.tier] ?? 5) - (TIER_PRIORITY[b.tier] ?? 5))
    .slice(0, 6)
    .map((b) => ({ slug: b.slug, emoji: b.emoji, label: b.label, tier: b.tier }));

  // Unificar publicaciones de los 4 modelos y ordenar por fecha descendente
  const publications = [
    ...obitersRaw.map((p) => {
      // Si es respuesta, mostramos "↩ a @handle" en el lugar del titulo
      // (compactando al estilo X). Si no, queda null.
      const replyTo = p.parentObiter
        ? `↩ a @${(p.parentObiter.user.firstName ?? "").toLowerCase().replace(/[^a-z0-9]/g, "")}`
        : null;
      return {
        id: p.id,
        kind: "obiter" as const,
        titulo: replyTo,
        contenido: p.content,
        materia: p.materia,
        tipo: p.tipo,
        tribunal: null as string | null,
        resumen: null as string | null,
        apoyosCount: p.apoyosCount,
        citasCount: p.citasCount,
        guardadosCount: p.guardadosCount,
        viewsCount: 0,
        createdAt: p.createdAt.toISOString(),
      };
    }),
    ...analisisRaw.map((p) => ({
      id: p.id,
      kind: "analisis" as const,
      titulo: p.titulo,
      contenido: null as string | null,
      materia: p.materia,
      tipo: p.formato,
      tribunal: `${p.tribunal}${p.numeroRol ? ` · ${p.numeroRol}` : ""}`,
      resumen: p.resumen,
      apoyosCount: p.apoyosCount,
      citasCount: p.citasCount,
      guardadosCount: 0,
      viewsCount: p.viewsCount,
      createdAt: p.createdAt.toISOString(),
    })),
    ...ensayosRaw.map((p) => ({
      id: p.id,
      kind: "ensayo" as const,
      titulo: p.titulo,
      contenido: null as string | null,
      materia: p.materia,
      tipo: p.tipo,
      tribunal: p.archivoFormato.toUpperCase(),
      resumen: p.resumen,
      apoyosCount: p.apoyosCount,
      citasCount: p.citasCount,
      guardadosCount: 0,
      viewsCount: p.viewsCount,
      createdAt: p.createdAt.toISOString(),
    })),
    ...debatesRaw.map((p) => ({
      id: p.id,
      kind: "debate" as const,
      titulo: p.titulo,
      contenido: null as string | null,
      materia: p.rama,
      tipo: p.estado,
      tribunal: p.autor2Id ? "vs." : "Buscando oponente",
      resumen: p.descripcion,
      apoyosCount: p.autor1Id === params.userId ? p.votosAutor1 : p.votosAutor2,
      citasCount: 0,
      guardadosCount: 0,
      viewsCount: 0,
      createdAt: p.createdAt.toISOString(),
    })),
    ...columnasRaw.map((p) => ({
      id: p.id,
      kind: "columna" as const,
      titulo: p.titulo,
      contenido: null as string | null,
      materia: p.materia,
      tipo: null as string | null,
      tribunal: null as string | null,
      resumen: p.resumen,
      apoyosCount: p.apoyosCount,
      citasCount: p.citasCount,
      guardadosCount: 0,
      viewsCount: p.viewsCount,
      createdAt: p.createdAt.toISOString(),
    })),
  ].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1));

  const variant = searchParams?.variant;

  const user = {
    id: targetUser.id,
    firstName: targetUser.firstName,
    lastName: targetUser.lastName,
    universidad: targetUser.universidad,
    sede: targetUser.sede,
    universityYear: targetUser.universityYear,
    avatarUrl: targetUser.avatarUrl,
    coverUrl: targetUser.coverUrl,
    bio: targetUser.bio,
    cvAvailable: targetUser.cvAvailable,
    region: targetUser.region,
    corte: targetUser.corte,
    xp: targetUser.xp,
    causasGanadas: targetUser.causasGanadas,
    causasPerdidas: targetUser.causasPerdidas,
    winRate,
    tier,
    grado: targetUser.grado,
    flashcardsStudied: targetUser._count.flashcardProgress,
    mcqAttempts: targetUser._count.mcqAttempts,
    trueFalseAttempts: targetUser._count.trueFalseAttempts,
    memberSince: targetUser.createdAt.toISOString(),
    etapaActual: targetUser.etapaActual,
    anioIngreso: targetUser.anioIngreso,
    anioEgreso: targetUser.anioEgreso,
    anioJura: targetUser.anioJura,
    empleoActual: targetUser.empleoActual,
    cargoActual: targetUser.cargoActual,
    especialidades: targetUser.especialidades,
    intereses: targetUser.intereses,
    linkedinUrl: targetUser.linkedinUrl,
    togaTierName: togaTier.nombre,
    togaTierEmoji: togaTier.emoji,
    togaTierTopLabel: togaTier.topLabel,
  };

  const earnedBadgesSlugs = targetBadges.map((b) => b.badge);
  const colegasPreviewSix = targetColegas.slice(0, 6);

  // Variant shared props (subset — editorial/moderno don't need tutor/cv/etc.)
  if (variant === "editorial") {
    return (
      <PerfilEditorial
        isOwnProfile={isOwnProfile}
        user={user}
        colegaStatus={colegaStatus.status}
        requestId={colegaStatus.requestId ?? null}
        colegaCount={colegaCount}
        earnedBadges={earnedBadgesSlugs}
        colegasPreview={colegasPreviewSix}
        publications={publications}
        obiterCount={obiterStats._count.id}
        obiterCitasReceived={obiterStats._sum.citasCount ?? 0}
        obiterApoyosReceived={obiterStats._sum.apoyosCount ?? 0}
        cvRequestStatus={cvRequest?.status ?? null}
        especialidadesCalculadas={especialidadesCalculadas}
        especialidadesDeclaradas={especialidadesDeclaradas}
        trayectoria={trayectoria}
        topBadges={topBadges}
      />
    );
  }

  if (variant === "moderno") {
    return (
      <PerfilModerno
        isOwnProfile={isOwnProfile}
        user={user}
        colegaStatus={colegaStatus.status}
        requestId={colegaStatus.requestId ?? null}
        colegaCount={colegaCount}
        earnedBadges={earnedBadgesSlugs}
        colegasPreview={colegasPreviewSix}
        publications={publications}
        obiterCount={obiterStats._count.id}
        obiterCitasReceived={obiterStats._sum.citasCount ?? 0}
        obiterApoyosReceived={obiterStats._sum.apoyosCount ?? 0}
        cvRequestStatus={cvRequest?.status ?? null}
        especialidadesCalculadas={especialidadesCalculadas}
        especialidadesDeclaradas={especialidadesDeclaradas}
        trayectoria={trayectoria}
        topBadges={topBadges}
      />
    );
  }

  return (
    <PerfilPublico
      isOwnProfile={isOwnProfile}
      publications={publications}
      user={user}
      colegaStatus={colegaStatus.status}
      requestId={colegaStatus.requestId ?? null}
      colegaCount={colegaCount}
      earnedBadges={earnedBadgesSlugs}
      colegasPreview={colegasPreviewSix}
      cvRequestStatus={cvRequest?.status ?? null}
      diarioPostCount={diarioPostCount}
      obiterCount={obiterStats._count.id}
      obiterCitasReceived={obiterStats._sum.citasCount ?? 0}
      obiterApoyosReceived={obiterStats._sum.apoyosCount ?? 0}
      tutorStats={tutorStats}
      recentEvaluations={recentEvaluations.map((e) => ({
        rating: e.rating,
        comentario: e.comentario!,
        evaluadorNombre: e.evaluador.firstName,
      }))}
      especialidadesCalculadas={especialidadesCalculadas}
      especialidadesDeclaradas={especialidadesDeclaradas}
      trayectoria={trayectoria}
      topBadges={topBadges}
    />
  );
}
