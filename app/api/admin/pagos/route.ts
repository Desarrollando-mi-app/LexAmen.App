import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = request.nextUrl;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = 20;
  const skip = (page - 1) * limit;

  const [subscriptions, total, activeCount, revenueResult] = await Promise.all([
    prisma.subscription.findMany({
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.subscription.count(),
    prisma.subscription.count({ where: { status: "ACTIVE" } }),
    prisma.$queryRaw<{ total: bigint }[]>`
      SELECT COALESCE(SUM("amount"), 0)::bigint as total
      FROM "Subscription"
      WHERE "status" = 'ACTIVE'
    `,
  ]);

  const totalRevenue = Number(revenueResult[0]?.total ?? 0);

  // Approximate MRR: active monthly + annual/12
  const monthlyRevenue = await prisma.$queryRaw<{ mrr: bigint }[]>`
    SELECT COALESCE(
      SUM(CASE
        WHEN plan = 'PREMIUM_MONTHLY' THEN amount
        WHEN plan = 'PREMIUM_ANNUAL' THEN amount / 12
        ELSE 0
      END), 0
    )::bigint as mrr
    FROM "Subscription"
    WHERE "status" = 'ACTIVE'
  `;

  return NextResponse.json({
    mrr: Number(monthlyRevenue[0]?.mrr ?? 0),
    totalRevenue,
    activeSubscriptions: activeCount,
    subscriptions: subscriptions.map((s) => ({
      id: s.id,
      userId: s.userId,
      userName: `${s.user.firstName} ${s.user.lastName}`,
      plan: s.plan,
      amount: s.amount,
      currency: s.currency,
      status: s.status,
      createdAt: s.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
