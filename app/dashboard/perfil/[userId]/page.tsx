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
  const [targetUser, colegaStatus, colegaCount, targetBadges, targetColegas, cvRequest, diarioPostCount, obiterStats, tutorStats, recentEvaluations, xpByMateria, obitersRaw, analisisRaw, ensayosRaw, debatesRaw, columnasRaw] =
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
      // XP by materia for especialidades calculadas
      prisma.xpLog.groupBy({
        by: ["materia"],
        where: { userId: params.userId, materia: { not: null }, amount: { gt: 0 } },
        _sum: { amount: true },
        orderBy: { _sum: { amount: "desc" } },
        take: 5,
      }),
      // Publicaciones: los 4 tipos (ObiterDictum legacy, AnalisisSentencia, Ensayo, DebateJuridico)
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

  // Especialidades: agrupar XP por rama canónica (top-level) para evitar duplicación
  // entre "Derecho Civil" y sus sub-unidades ("Obligaciones", "Actos Jurídicos", etc.)
  const CANONICAL_RAMAS: Record<string, string> = {
    civil: "Derecho Civil",
    obligaciones: "Derecho Civil",
    contratos: "Derecho Civil",
    bienes: "Derecho Civil",
    familia: "Derecho Civil",
    sucesiones: "Derecho Civil",
    acto_juridico: "Derecho Civil",
    actos_juridicos: "Derecho Civil",
    responsabilidad: "Derecho Civil",
    penal: "Derecho Penal",
    penal_general: "Derecho Penal",
    penal_especial: "Derecho Penal",
    procesal: "Derecho Procesal",
    procesal_civil: "Derecho Procesal Civil",
    procesal_penal: "Derecho Procesal Penal",
    constitucional: "Derecho Constitucional",
    administrativo: "Derecho Administrativo",
    comercial: "Derecho Comercial",
    laboral: "Derecho del Trabajo",
    trabajo: "Derecho del Trabajo",
    internacional: "Derecho Internacional",
    tributario: "Derecho Tributario",
    economico: "Derecho Económico",
  };
  const ramaBuckets = new Map<string, number>();
  for (const m of xpByMateria) {
    if (!m.materia || !m._sum.amount) continue;
    const key = m.materia.toLowerCase().trim();
    const canonical = CANONICAL_RAMAS[key] ?? m.materia;
    ramaBuckets.set(canonical, (ramaBuckets.get(canonical) ?? 0) + m._sum.amount);
  }
  const ramaEntries = Array.from(ramaBuckets.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxXp = ramaEntries[0]?.[1] ?? 1;
  const especialidadesCalculadas = ramaEntries.map(([materia, xp]) => ({
    materia,
    porcentaje: Math.round((xp / maxXp) * 100),
  }));

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

  // Trayectoria timeline
  const trayectoria: Array<{ tipo: string; anio: number; detalle?: string }> = [];
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
    ...obitersRaw.map((p) => ({
      id: p.id,
      kind: "obiter" as const,
      titulo: null as string | null,
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
    })),
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
