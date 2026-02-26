import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Fetch causas pendientes donde soy el retado
  const pending = await prisma.causa.findMany({
    where: {
      challengedId: authUser.id,
      status: "PENDING",
    },
    orderBy: { createdAt: "desc" },
    include: {
      challenger: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  return NextResponse.json({
    pending: pending.map((c) => ({
      id: c.id,
      challengerName: `${c.challenger.firstName} ${c.challenger.lastName}`,
      createdAt: c.createdAt.toISOString(),
    })),
  });
}
