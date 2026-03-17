import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/user/[userId]/colegas-comun ───────────────────
// Returns the mutual colegas between the authenticated user and [userId]

async function getColegaIds(userId: string): Promise<string[]> {
  const requests = await prisma.colegaRequest.findMany({
    where: {
      status: "ACCEPTED",
      OR: [{ senderId: userId }, { receiverId: userId }],
    },
    select: { senderId: true, receiverId: true },
  });

  const ids: string[] = [];
  for (const r of requests) {
    if (r.senderId !== userId) ids.push(r.senderId);
    if (r.receiverId !== userId) ids.push(r.receiverId);
  }
  return ids;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId: targetUserId } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Don't show mutual colegas for your own profile
  if (targetUserId === authUser.id) {
    return NextResponse.json({ count: 0, colegas: [] });
  }

  // Get colegas for both users in parallel
  const [misColegas, susColegas] = await Promise.all([
    getColegaIds(authUser.id),
    getColegaIds(targetUserId),
  ]);

  // Intersection — exclude current user and target user
  const susColegasSet = new Set(susColegas);
  const mutualIds = misColegas.filter(
    (id) =>
      susColegasSet.has(id) && id !== authUser.id && id !== targetUserId
  );

  if (mutualIds.length === 0) {
    return NextResponse.json({ count: 0, colegas: [] });
  }

  // Fetch details for up to 5 mutual colegas
  const colegas = await prisma.user.findMany({
    where: { id: { in: mutualIds.slice(0, 5) } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
    },
    orderBy: { firstName: "asc" },
  });

  return NextResponse.json({
    count: mutualIds.length,
    colegas,
  });
}
