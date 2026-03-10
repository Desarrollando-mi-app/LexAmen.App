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
  const logsPage = Math.max(
    1,
    parseInt(url.searchParams.get("logsPage") ?? "1")
  );
  const logsLimit = 20;
  const logsSkip = (logsPage - 1) * logsLimit;

  // Health checks
  const healthChecks = [];

  // 1. Database check
  const dbStart = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    healthChecks.push({
      service: "PostgreSQL (Supabase)",
      status: "ok" as const,
      latencyMs: Date.now() - dbStart,
    });
  } catch (e) {
    healthChecks.push({
      service: "PostgreSQL (Supabase)",
      status: "error" as const,
      latencyMs: Date.now() - dbStart,
      message: e instanceof Error ? e.message : "Error desconocido",
    });
  }

  // 2. Supabase Auth check
  const authStart = Date.now();
  try {
    await supabase.auth.getUser();
    healthChecks.push({
      service: "Supabase Auth",
      status: "ok" as const,
      latencyMs: Date.now() - authStart,
    });
  } catch (e) {
    healthChecks.push({
      service: "Supabase Auth",
      status: "error" as const,
      latencyMs: Date.now() - authStart,
      message: e instanceof Error ? e.message : "Error desconocido",
    });
  }

  // 3. Supabase Storage check
  const storageStart = Date.now();
  try {
    await supabase.storage.listBuckets();
    healthChecks.push({
      service: "Supabase Storage",
      status: "ok" as const,
      latencyMs: Date.now() - storageStart,
    });
  } catch (e) {
    healthChecks.push({
      service: "Supabase Storage",
      status: "error" as const,
      latencyMs: Date.now() - storageStart,
      message: e instanceof Error ? e.message : "Error desconocido",
    });
  }

  // Admin logs
  const [logs, logsTotal] = await Promise.all([
    prisma.adminLog.findMany({
      orderBy: { createdAt: "desc" },
      skip: logsSkip,
      take: logsLimit,
      include: {
        admin: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.adminLog.count(),
  ]);

  // DB stats
  const tableCountResult = await prisma.$queryRaw<{ count: bigint }[]>`
    SELECT COUNT(*)::bigint as count
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `;

  const rowCountResult = await prisma.$queryRaw<{ estimate: bigint }[]>`
    SELECT SUM(n_live_tup)::bigint as estimate
    FROM pg_stat_user_tables
    WHERE schemaname = 'public'
  `;

  // Format uptime
  const uptimeSeconds = process.uptime();
  const hours = Math.floor(uptimeSeconds / 3600);
  const mins = Math.floor((uptimeSeconds % 3600) / 60);
  const uptime = `${hours}h ${mins}m`;

  return NextResponse.json({
    health: healthChecks,
    logs: logs.map((l) => ({
      id: l.id,
      action: l.action,
      target: l.target,
      createdAt: l.createdAt.toISOString(),
      adminName: `${l.admin.firstName} ${l.admin.lastName}`,
    })),
    logsTotal,
    logsPage,
    logsTotalPages: Math.ceil(logsTotal / logsLimit),
    system: {
      nodeVersion: process.version,
      nextVersion: "14.2.35",
      prismaVersion: "7.4.1",
      environment: process.env.NODE_ENV ?? "development",
      uptime,
    },
    dbStats: {
      totalTables: Number(tableCountResult[0]?.count ?? 0),
      totalRows: Number(rowCountResult[0]?.estimate ?? 0),
    },
  });
}
