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
  const tab = url.searchParams.get("tab") ?? "content";
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1"));
  const statusFilter = url.searchParams.get("status") ?? "";
  const limit = 20;
  const skip = (page - 1) * limit;

  if (tab === "content") {
    const where: Record<string, unknown> = {};
    if (statusFilter) where.status = statusFilter;

    const [items, total, pendingCount] = await Promise.all([
      prisma.contentReport.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.contentReport.count({ where }),
      prisma.contentReport.count({ where: { status: "PENDING" } }),
    ]);

    return NextResponse.json({
      items: items.map((r) => ({
        id: r.id,
        contentType: r.contentType,
        contentId: r.contentId,
        reason: r.reason,
        description: r.description,
        status: r.status,
        createdAt: r.createdAt.toISOString(),
        userName: `${r.user.firstName} ${r.user.lastName}`,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pendingCount,
    });
  }

  if (tab === "ayudantia") {
    const [items, total, pendingCount] = await Promise.all([
      prisma.ayudantiaReport.findMany({
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          reportedBy: { select: { firstName: true, lastName: true } },
          ayudantia: {
            select: {
              id: true,
              description: true,
              materia: true,
              reportCount: true,
              isActive: true,
              user: { select: { firstName: true, lastName: true } },
            },
          },
        },
      }),
      prisma.ayudantiaReport.count(),
      prisma.ayudantiaReport.count(),
    ]);

    return NextResponse.json({
      items: items.map((r) => ({
        id: r.id,
        ayudantiaId: r.ayudantiaId,
        reason: r.reason,
        createdAt: r.createdAt.toISOString(),
        reporterName: `${r.reportedBy.firstName} ${r.reportedBy.lastName}`,
        ayudantiaTitle: `${r.ayudantia.materia}: ${r.ayudantia.description.slice(0, 60)}`,
        ayudantiaOwner: `${r.ayudantia.user.firstName} ${r.ayudantia.user.lastName}`,
        ayudantiaReportCount: r.ayudantia.reportCount,
        ayudantiaActive: r.ayudantia.isActive,
      })),
      total,
      page,
      totalPages: Math.ceil(total / limit),
      pendingCount,
    });
  }

  return NextResponse.json({ error: "Tab no válido" }, { status: 400 });
}

// PATCH: resolve / dismiss / deactivate
export async function PATCH(request: NextRequest) {
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

  const { reportId, action, tab } = (await request.json()) as {
    reportId: string;
    action: string;
    tab: string;
  };

  if (tab === "content") {
    if (action === "resolve") {
      await prisma.contentReport.update({
        where: { id: reportId },
        data: { status: "RESOLVED" },
      });
    } else if (action === "dismiss") {
      await prisma.contentReport.update({
        where: { id: reportId },
        data: { status: "DISMISSED" },
      });
    }
  } else if (tab === "ayudantia") {
    if (action === "dismiss") {
      await prisma.ayudantiaReport.delete({ where: { id: reportId } });
    } else if (action === "deactivate") {
      await prisma.ayudantia.update({
        where: { id: reportId },
        data: { isActive: false },
      });
    }
  }

  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: `REPORT_${action.toUpperCase()}`,
      target: reportId,
      metadata: { tab },
    },
  });

  return NextResponse.json({ ok: true });
}
