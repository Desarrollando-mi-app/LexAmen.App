import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegaStatus, getColegas, getColegaCount } from "@/lib/colegas";
import { getUserTutorStats } from "@/lib/sala-utils";
import { PerfilPublico } from "./perfil-publico";

interface Props {
  params: { userId: string };
}

export default async function PerfilPage({ params }: Props) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Si es mi propio perfil, redirigir al dashboard
  if (params.userId === authUser.id) {
    redirect("/dashboard");
  }

  // Buscar usuario
  const [targetUser, colegaStatus, colegaCount, targetBadges, targetColegas, cvRequest, diarioPostCount, obiterStats, tutorStats, recentEvaluations, xpByMateria] =
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
    ]);

  if (!targetUser) {
    notFound();
  }

  const tier = targetUser.leagueMembers[0]?.league.tier ?? null;
  const totalCausas = targetUser.causasGanadas + targetUser.causasPerdidas;
  const winRate =
    totalCausas > 0
      ? Math.round((targetUser.causasGanadas / totalCausas) * 100)
      : 0;

  // Especialidades calculadas from XP by materia
  const maxXp = xpByMateria[0]?._sum.amount ?? 1;
  const especialidadesCalculadas = xpByMateria
    .filter((m) => m.materia && m._sum.amount)
    .map((m) => ({
      materia: m.materia!,
      porcentaje: Math.round(((m._sum.amount ?? 0) / maxXp) * 100),
    }));

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

  return (
    <PerfilPublico
      user={{
        id: targetUser.id,
        firstName: targetUser.firstName,
        lastName: targetUser.lastName,
        universidad: targetUser.universidad,
        sede: targetUser.sede,
        universityYear: targetUser.universityYear,
        avatarUrl: targetUser.avatarUrl,
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
      }}
      colegaStatus={colegaStatus.status}
      requestId={colegaStatus.requestId ?? null}
      colegaCount={colegaCount}
      earnedBadges={targetBadges.map((b) => b.badge)}
      colegasPreview={targetColegas.slice(0, 6)}
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
      trayectoria={trayectoria}
      topBadges={topBadges}
    />
  );
}
