import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const eventos = await prisma.eventoAcademico.findMany({
    where: { userId: authUser.id, isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      _count: { select: { interesados: true } },
    },
  });

  // El usuario puede haber marcado interés en sus propios eventos.
  const userInteres = await prisma.eventoInteres.findMany({
    where: {
      userId: authUser.id,
      eventoId: { in: eventos.map((e) => e.id) },
    },
    select: { eventoId: true },
  });
  const userInteresIds = new Set(userInteres.map((i) => i.eventoId));

  const result = eventos.map((e) => ({
    ...e,
    interesadosCount: e._count.interesados,
    hasInteres: userInteresIds.has(e.id),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    fecha: e.fecha.toISOString(),
    fechaFin: e.fechaFin?.toISOString() ?? null,
    approvedAt: e.approvedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(result);
}
