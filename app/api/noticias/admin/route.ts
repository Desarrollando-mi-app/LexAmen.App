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

  const { searchParams } = new URL(request.url);
  const estado = searchParams.get("estado");
  const fuente = searchParams.get("fuente");
  const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
  const limit = 25;

  const where: Record<string, unknown> = {};
  if (estado) where.estado = estado;
  if (fuente) where.fuente = fuente;

  const [noticias, total] = await Promise.all([
    prisma.noticiaJuridica.findMany({
      where,
      orderBy: { fechaRecopilacion: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.noticiaJuridica.count({ where }),
  ]);

  return NextResponse.json({
    noticias: noticias.map((n) => ({
      ...n,
      fechaPublicacionFuente: n.fechaPublicacionFuente?.toISOString() ?? null,
      fechaRecopilacion: n.fechaRecopilacion.toISOString(),
      fechaAprobacion: n.fechaAprobacion?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    })),
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
