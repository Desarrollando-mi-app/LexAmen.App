import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegas } from "@/lib/colegas";
import { CausasHub } from "./causas-hub";

export default async function CausasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  // Consultas en paralelo
  const [dbUser, pending, activeCausas, history, activeRooms, roomHistory, badges, colegas] =
    await Promise.all([
      // Stats del usuario
      prisma.user.findUnique({
        where: { id: authUser.id },
        select: { causasGanadas: true, causasPerdidas: true },
      }),

      // Causas pendientes (donde soy el retado)
      prisma.causa.findMany({
        where: { challengedId: authUser.id, status: "PENDING" },
        orderBy: { createdAt: "desc" },
        include: {
          challenger: { select: { firstName: true, lastName: true } },
        },
      }),

      // Causas activas 1v1
      prisma.causa.findMany({
        where: {
          OR: [
            { challengerId: authUser.id },
            { challengedId: authUser.id },
          ],
          status: "ACTIVE",
        },
        orderBy: { startedAt: "desc" },
        include: {
          challenger: { select: { id: true, firstName: true, lastName: true } },
          challenged: { select: { id: true, firstName: true, lastName: true } },
        },
      }),

      // Historial 1v1 (últimas 20)
      prisma.causa.findMany({
        where: {
          OR: [
            { challengerId: authUser.id },
            { challengedId: authUser.id },
          ],
          status: { in: ["COMPLETED", "REJECTED"] },
        },
        orderBy: { createdAt: "desc" },
        take: 20,
        include: {
          challenger: { select: { id: true, firstName: true, lastName: true } },
          challenged: { select: { id: true, firstName: true, lastName: true } },
          winner: { select: { id: true } },
        },
      }),

      // Salas activas/lobby
      prisma.causaRoom.findMany({
        where: {
          participants: { some: { userId: authUser.id } },
          status: { in: ["lobby", "active"] },
        },
        orderBy: { createdAt: "desc" },
        include: {
          createdBy: { select: { firstName: true } },
          _count: { select: { participants: true } },
        },
      }),

      // Historial salas (últimas 10)
      prisma.causaRoom.findMany({
        where: {
          participants: { some: { userId: authUser.id } },
          status: "finished",
        },
        orderBy: { createdAt: "desc" },
        take: 10,
        include: {
          _count: { select: { participants: true } },
          participants: {
            where: { userId: authUser.id },
            select: { position: true, score: true },
          },
        },
      }),

      // Badges del usuario
      prisma.userBadge.findMany({
        where: { userId: authUser.id },
        select: { badge: true },
      }),

      // Colegas para desafiar
      getColegas(authUser.id),
    ]);

  // Serializar 1v1
  const serializedPending = pending.map((c) => ({
    id: c.id,
    challengerName: `${c.challenger.firstName} ${c.challenger.lastName}`,
    createdAt: c.createdAt.toISOString(),
  }));

  const serializedActive = activeCausas.map((c) => {
    const opponent =
      c.challengerId === authUser.id ? c.challenged : c.challenger;
    return {
      id: c.id,
      opponentName: `${opponent.firstName} ${opponent.lastName}`,
      startedAt: c.startedAt?.toISOString() ?? "",
    };
  });

  const serializedHistory = history.map((c) => {
    const opponent =
      c.challengerId === authUser.id ? c.challenged : c.challenger;
    return {
      id: c.id,
      opponentName: `${opponent.firstName} ${opponent.lastName}`,
      status: c.status,
      won: c.winner?.id === authUser.id,
      lost: c.winner !== null && c.winner.id !== authUser.id,
      createdAt: c.createdAt.toISOString(),
    };
  });

  // Serializar rooms
  const serializedActiveRooms = activeRooms.map((r) => ({
    id: r.id,
    code: r.id.slice(-6).toUpperCase(),
    mode: r.mode,
    status: r.status,
    maxPlayers: r.maxPlayers,
    participantCount: r._count.participants,
    creatorName: r.createdBy.firstName,
    createdAt: r.createdAt.toISOString(),
  }));

  const serializedRoomHistory = roomHistory.map((r) => ({
    id: r.id,
    participantCount: r._count.participants,
    position: r.participants[0]?.position ?? null,
    score: r.participants[0]?.score ?? 0,
    createdAt: r.createdAt.toISOString(),
  }));

  return (
    <CausasHub
      causasGanadas={dbUser?.causasGanadas ?? 0}
      causasPerdidas={dbUser?.causasPerdidas ?? 0}
      pending={serializedPending}
      active={serializedActive}
      history={serializedHistory}
      activeRooms={serializedActiveRooms}
      roomHistory={serializedRoomHistory}
      earnedBadges={badges.map((b) => b.badge)}
      colegas={colegas.map((c) => ({
        id: c.id,
        firstName: c.firstName,
        lastName: c.lastName,
        tier: c.tier,
      }))}
    />
  );
}
