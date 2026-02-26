import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
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
  const [dbUser, pending, history] = await Promise.all([
    // Stats del usuario
    prisma.user.findUnique({
      where: { id: authUser.id },
      select: { causasGanadas: true, causasPerdidas: true },
    }),

    // Causas pendientes (donde soy el retado)
    prisma.causa.findMany({
      where: {
        challengedId: authUser.id,
        status: "PENDING",
      },
      orderBy: { createdAt: "desc" },
      include: {
        challenger: {
          select: { firstName: true, lastName: true },
        },
      },
    }),

    // Historial (últimas 20)
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
        challenger: {
          select: { id: true, firstName: true, lastName: true },
        },
        challenged: {
          select: { id: true, firstName: true, lastName: true },
        },
        winner: {
          select: { id: true },
        },
      },
    }),
  ]);

  // Causas activas donde participo
  const activeCausas = await prisma.causa.findMany({
    where: {
      OR: [
        { challengerId: authUser.id },
        { challengedId: authUser.id },
      ],
      status: "ACTIVE",
    },
    orderBy: { startedAt: "desc" },
    include: {
      challenger: {
        select: { id: true, firstName: true, lastName: true },
      },
      challenged: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

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

  return (
    <CausasHub
      causasGanadas={dbUser?.causasGanadas ?? 0}
      causasPerdidas={dbUser?.causasPerdidas ?? 0}
      pending={serializedPending}
      active={serializedActive}
      history={serializedHistory}
    />
  );
}
