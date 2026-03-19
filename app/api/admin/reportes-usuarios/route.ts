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
  const estado = url.searchParams.get("estado") ?? "pendiente";

  const where = estado === "todos" ? {} : { estado };

  const [reportes, total] = await Promise.all([
    prisma.reporteUsuario.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        reporter: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true },
        },
        reportado: {
          select: { id: true, firstName: true, lastName: true, avatarUrl: true, email: true, suspended: true },
        },
      },
    }),
    prisma.reporteUsuario.count({ where }),
  ]);

  return NextResponse.json({
    reportes: reportes.map((r) => ({
      ...r,
      createdAt: r.createdAt.toISOString(),
      resueltaAt: r.resueltaAt?.toISOString() ?? null,
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}

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
  const { reporteId, estado, resolucion } = body as {
    reporteId: string;
    estado: string;
    resolucion?: string;
  };

  if (!reporteId || !estado) {
    return NextResponse.json({ error: "Faltan campos" }, { status: 400 });
  }

  if (!["revisado", "accion_tomada", "descartado"].includes(estado)) {
    return NextResponse.json({ error: "Estado no válido" }, { status: 400 });
  }

  await prisma.reporteUsuario.update({
    where: { id: reporteId },
    data: {
      estado,
      resolucion: resolucion ?? null,
      resueltoPor: authUser.id,
      resueltaAt: new Date(),
    },
  });

  await prisma.adminLog.create({
    data: {
      adminId: authUser.id,
      action: "RESOLVE_USER_REPORT",
      target: reporteId,
      metadata: { estado, resolucion },
    },
  });

  return NextResponse.json({ ok: true });
}
