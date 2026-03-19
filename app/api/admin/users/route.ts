import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@/app/generated/prisma/client";

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
  const search = url.searchParams.get("search") ?? "";
  const plan = url.searchParams.get("plan") ?? "";
  const status = url.searchParams.get("status") ?? ""; // active | suspended | deleted
  const sort = url.searchParams.get("sort") ?? "createdAt";
  const order = url.searchParams.get("order") === "asc" ? "asc" : "desc";

  // Build where clause
  const where: Prisma.UserWhereInput = {};

  if (search) {
    where.OR = [
      { firstName: { contains: search, mode: "insensitive" } },
      { lastName: { contains: search, mode: "insensitive" } },
      { email: { contains: search, mode: "insensitive" } },
    ];
  }

  if (plan === "FREE" || plan === "PREMIUM_MONTHLY" || plan === "PREMIUM_ANNUAL") {
    where.plan = plan;
  }

  if (status === "active") {
    where.suspended = false;
    where.deletedAt = null;
  } else if (status === "suspended") {
    where.suspended = true;
  } else if (status === "deleted") {
    where.deletedAt = { not: null };
  } else {
    // Default: exclude deleted
    where.deletedAt = null;
  }

  const orderBy: Prisma.UserOrderByWithRelationInput = {};
  if (sort === "xp") orderBy.xp = order;
  else if (sort === "firstName") orderBy.firstName = order;
  else if (sort === "email") orderBy.email = order;
  else orderBy.createdAt = order;

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      orderBy,
      skip,
      take: limit,
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        universidad: true,
        sede: true,
        universityYear: true,
        avatarUrl: true,
        plan: true,
        xp: true,
        isAdmin: true,
        suspended: true,
        deletedAt: true,
        createdAt: true,
        causasGanadas: true,
        causasPerdidas: true,
        _count: {
          select: {
            flashcardProgress: true,
            mcqAttempts: true,
            trueFalseAttempts: true,
            badges: true,
          },
        },
      },
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    users: users.map((u) => ({
      ...u,
      createdAt: u.createdAt.toISOString(),
      deletedAt: u.deletedAt?.toISOString() ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// PATCH: admin actions (suspend, unsuspend, toggle admin, etc.)
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

  const body = await request.json();
  const { userId, action } = body as { userId: string; action: string };

  if (!userId || !action) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  // Don't allow self-modification for critical actions
  if (userId === authUser.id && (action === "suspend" || action === "removeAdmin")) {
    return NextResponse.json(
      { error: "No puedes realizar esta acción sobre ti mismo" },
      { status: 400 }
    );
  }

  let logAction = "";
  const logTarget = userId;

  switch (action) {
    case "suspend": {
      await prisma.user.update({
        where: { id: userId },
        data: {
          suspended: true,
          suspendedAt: new Date(),
          suspendedReason: body.reason ?? null,
        },
      });
      logAction = "SUSPEND_USER";
      break;
    }
    case "unsuspend": {
      await prisma.user.update({
        where: { id: userId },
        data: {
          suspended: false,
          suspendedAt: null,
          suspendedReason: null,
        },
      });
      logAction = "UNSUSPEND_USER";
      break;
    }
    case "makeAdmin": {
      await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: true },
      });
      logAction = "MAKE_ADMIN";
      break;
    }
    case "removeAdmin": {
      await prisma.user.update({
        where: { id: userId },
        data: { isAdmin: false },
      });
      logAction = "REMOVE_ADMIN";
      break;
    }
    case "resetXp": {
      await prisma.user.update({
        where: { id: userId },
        data: { xp: 0 },
      });
      logAction = "RESET_XP";
      break;
    }
    default:
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
  }

  // Log the action
  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: logAction,
      target: logTarget,
      metadata: body,
    },
  });

  return NextResponse.json({ ok: true });
}
