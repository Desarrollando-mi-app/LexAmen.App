import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { getColegas } from "@/lib/colegas";
import { CausasHub } from "./causas-hub";
import Image from "next/image";

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
    <div className="min-h-screen" style={{ backgroundColor: "var(--gz-cream)" }}>
      <div className="px-4 sm:px-6 pt-8 pb-4">
          <span className="font-ibm-mono text-[10px] uppercase tracking-[2px] text-gz-gold mb-2 block">
            Competici&oacute;n &middot; Causas
          </span>
          <div className="flex items-center gap-3 mb-1">
            <Image src="/brand/logo-sello.svg" alt="Studio Iuris" width={80} height={80} className="h-[60px] w-[60px] lg:h-[80px] lg:w-[80px]" />
            <h1 className="font-cormorant text-[38px] lg:text-[44px] font-bold text-gz-ink">Causas</h1>
          </div>
      </div>
      <div className="h-[2px] bg-gz-rule-dark" />
      <div className="mx-auto max-w-5xl px-4 sm:px-6 py-6">
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
      </div>
    </div>
  );
}
