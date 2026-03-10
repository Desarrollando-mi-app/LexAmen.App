// ─── Colegas helpers (server-only) ─────────────────────────
import { prisma } from "@/lib/prisma";

// ─── Types ─────────────────────────────────────────────────

export interface ColegaStatusResult {
  status: "none" | "pending_sent" | "pending_received" | "accepted" | "rejected";
  requestId?: string;
}

export interface ColegaUser {
  id: string;
  firstName: string;
  lastName: string;
  universidad: string | null;
  tier: string | null;
  xp: number;
}

export interface PendingRequest {
  id: string;
  senderId: string;
  senderFirstName: string;
  senderLastName: string;
  senderUniversidad: string | null;
  senderTier: string | null;
  createdAt: string;
}

export interface SentRequest {
  id: string;
  receiverId: string;
  receiverFirstName: string;
  receiverLastName: string;
  receiverUniversidad: string | null;
  receiverTier: string | null;
  createdAt: string;
}

// ─── getColegaStatus ───────────────────────────────────────

export async function getColegaStatus(
  currentUserId: string,
  targetUserId: string
): Promise<ColegaStatusResult> {
  const request = await prisma.colegaRequest.findFirst({
    where: {
      OR: [
        { senderId: currentUserId, receiverId: targetUserId },
        { senderId: targetUserId, receiverId: currentUserId },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  if (!request) return { status: "none" };

  if (request.status === "ACCEPTED") {
    return { status: "accepted", requestId: request.id };
  }

  if (request.status === "REJECTED") {
    return { status: "rejected", requestId: request.id };
  }

  // PENDING
  if (request.senderId === currentUserId) {
    return { status: "pending_sent", requestId: request.id };
  }

  return { status: "pending_received", requestId: request.id };
}

// ─── getColegas ────────────────────────────────────────────

export async function getColegas(userId: string): Promise<ColegaUser[]> {
  const requests = await prisma.colegaRequest.findMany({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: "ACCEPTED",
    },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          xp: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      },
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          xp: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      },
    },
  });

  return requests.map((r) => {
    const other = r.senderId === userId ? r.receiver : r.sender;
    const tier = other.leagueMembers[0]?.league.tier ?? null;
    return {
      id: other.id,
      firstName: other.firstName,
      lastName: other.lastName,
      universidad: other.universidad,
      tier,
      xp: other.xp,
    };
  });
}

// ─── getPendingRequests ────────────────────────────────────

export async function getPendingRequests(
  userId: string
): Promise<PendingRequest[]> {
  const requests = await prisma.colegaRequest.findMany({
    where: { receiverId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      sender: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      },
    },
  });

  return requests.map((r) => ({
    id: r.id,
    senderId: r.sender.id,
    senderFirstName: r.sender.firstName,
    senderLastName: r.sender.lastName,
    senderUniversidad: r.sender.universidad,
    senderTier: r.sender.leagueMembers[0]?.league.tier ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ─── getSentRequests ───────────────────────────────────────

export async function getSentRequests(
  userId: string
): Promise<SentRequest[]> {
  const requests = await prisma.colegaRequest.findMany({
    where: { senderId: userId, status: "PENDING" },
    orderBy: { createdAt: "desc" },
    include: {
      receiver: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
          leagueMembers: {
            orderBy: { league: { weekStart: "desc" } },
            take: 1,
            include: { league: { select: { tier: true } } },
          },
        },
      },
    },
  });

  return requests.map((r) => ({
    id: r.id,
    receiverId: r.receiver.id,
    receiverFirstName: r.receiver.firstName,
    receiverLastName: r.receiver.lastName,
    receiverUniversidad: r.receiver.universidad,
    receiverTier: r.receiver.leagueMembers[0]?.league.tier ?? null,
    createdAt: r.createdAt.toISOString(),
  }));
}

// ─── getPendingColegaCount ─────────────────────────────────

export async function getPendingColegaCount(
  userId: string
): Promise<number> {
  return prisma.colegaRequest.count({
    where: { receiverId: userId, status: "PENDING" },
  });
}

// ─── getColegaCount ────────────────────────────────────────

export async function getColegaCount(userId: string): Promise<number> {
  return prisma.colegaRequest.count({
    where: {
      OR: [{ senderId: userId }, { receiverId: userId }],
      status: "ACCEPTED",
    },
  });
}
