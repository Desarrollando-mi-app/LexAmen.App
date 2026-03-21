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
  const accion = url.searchParams.get("accion") ?? undefined;
  const desde = url.searchParams.get("desde") ?? undefined;
  const hasta = url.searchParams.get("hasta") ?? undefined;
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const limit = Math.min(
    100,
    Math.max(1, parseInt(url.searchParams.get("limit") ?? "30"))
  );
  const skip = (page - 1) * limit;

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (accion) {
    where.action = accion;
  }

  if (desde || hasta) {
    where.createdAt = {};
    if (desde) {
      where.createdAt.gte = new Date(desde);
    }
    if (hasta) {
      // Include the full day
      const hastaDate = new Date(hasta);
      hastaDate.setHours(23, 59, 59, 999);
      where.createdAt.lte = hastaDate;
    }
  }

  const [logs, total] = await Promise.all([
    prisma.adminLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        admin: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.adminLog.count({ where }),
  ]);

  return NextResponse.json({
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      target: l.target,
      metadata: l.metadata,
      createdAt: l.createdAt.toISOString(),
      adminName: `${l.admin.firstName} ${l.admin.lastName}`,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
