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
  const [targetUser, colegaStatus, colegaCount, targetBadges, targetColegas, cvRequest, diarioPostCount, obiterStats, tutorStats, recentEvaluations] =
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
          causasGanadas: true,
          causasPerdidas: true,
          createdAt: true,
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
        flashcardsStudied: targetUser._count.flashcardProgress,
        mcqAttempts: targetUser._count.mcqAttempts,
        trueFalseAttempts: targetUser._count.trueFalseAttempts,
        memberSince: targetUser.createdAt.toISOString(),
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
    />
  );
}
