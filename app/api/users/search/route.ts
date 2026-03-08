import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const q = searchParams.get("q")?.trim();
  const university = searchParams.get("university")?.trim();

  if (!q || q.length < 2) {
    return NextResponse.json({ users: [] });
  }

  // Build where clause
  const whereClause: Record<string, unknown> = {
    NOT: { id: authUser.id },
    deletedAt: null,
    OR: [
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
    ],
  };

  if (university) {
    whereClause.institution = university;
  }

  // Buscar usuarios por nombre
  const users = await prisma.user.findMany({
    where: whereClause as never,
    take: 10,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      institution: true,
      avatarUrl: true,
      xp: true,
      leagueMembers: {
        orderBy: { league: { weekStart: "desc" } },
        take: 1,
        include: { league: { select: { tier: true } } },
      },
    },
  });

  // Batch fetch colega statuses
  const userIds = users.map((u) => u.id);
  const colegaRequests = await prisma.colegaRequest.findMany({
    where: {
      OR: [
        { senderId: authUser.id, receiverId: { in: userIds } },
        { senderId: { in: userIds }, receiverId: authUser.id },
      ],
    },
  });

  // Map statuses
  const statusMap = new Map<
    string,
    { status: string; requestId: string }
  >();
  for (const req of colegaRequests) {
    const otherId =
      req.senderId === authUser.id ? req.receiverId : req.senderId;
    if (req.status === "ACCEPTED") {
      statusMap.set(otherId, { status: "accepted", requestId: req.id });
    } else if (req.status === "PENDING") {
      const s =
        req.senderId === authUser.id ? "pending_sent" : "pending_received";
      statusMap.set(otherId, { status: s, requestId: req.id });
    }
  }

  const results = users.map((u) => ({
    id: u.id,
    firstName: u.firstName,
    lastName: u.lastName,
    institution: u.institution,
    avatarUrl: (u as Record<string, unknown>).avatarUrl as string | null,
    xp: u.xp,
    tier: u.leagueMembers[0]?.league.tier ?? null,
    colegaStatus: statusMap.get(u.id)?.status ?? "none",
    requestId: statusMap.get(u.id)?.requestId ?? null,
  }));

  return NextResponse.json({ users: results });
}
