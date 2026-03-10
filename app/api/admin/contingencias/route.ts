import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Listar todas las hashtags (admin) ──────────────

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

  const [items, total] = await Promise.all([
    prisma.diarioHashtag.findMany({
      orderBy: { count: "desc" },
      skip,
      take: limit,
    }),
    prisma.diarioHashtag.count(),
  ]);

  return NextResponse.json({
    items: items.map((h) => ({
      ...h,
      createdAt: h.createdAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

// ─── PATCH: Modificar hashtag (admin) ────────────────────

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
  const { id, pinned, hidden, isContingencia } = body as {
    id: string;
    pinned?: boolean;
    hidden?: boolean;
    isContingencia?: boolean;
  };

  if (!id) {
    return NextResponse.json({ error: "ID requerido" }, { status: 400 });
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: any = {};
  if (typeof pinned === "boolean") data.pinned = pinned;
  if (typeof hidden === "boolean") data.hidden = hidden;
  if (typeof isContingencia === "boolean") data.isContingencia = isContingencia;

  await prisma.diarioHashtag.update({
    where: { id },
    data,
  });

  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: "UPDATE_CONTINGENCIA",
      target: id,
      metadata: data,
    },
  });

  return NextResponse.json({ ok: true });
}
