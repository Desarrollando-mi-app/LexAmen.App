import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { AyudantiasV4Client } from "./ayudantias-client";

/**
 * Listado público de ayudantías (vista V4 editorial).
 * Trae AMBOS tipos (OFREZCO + BUSCO).
 * Para gestión de las propias publicaciones y sesiones: /ayudantias/gestion.
 */
export default async function AyudantiasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const ayudantias = await prisma.ayudantia.findMany({
    where: { isActive: true, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          universidad: true,
        },
      },
      _count: { select: { sesiones: { where: { status: "completada" } } } },
    },
  });

  const userIds = Array.from(new Set(ayudantias.map((a) => a.userId)));
  const ratingStats = await prisma.ayudantiaEvaluacion.groupBy({
    by: ["evaluadoId"],
    where: { evaluadoId: { in: userIds } },
    _avg: { rating: true },
    _count: { id: true },
  });
  const ratingMap = Object.fromEntries(
    ratingStats.map((r) => [r.evaluadoId, { avg: r._avg.rating, count: r._count.id }]),
  );

  const serialized = ayudantias.map((a) => ({
    id: a.id,
    type: a.type as "OFREZCO" | "BUSCO",
    materia: a.materia,
    titulo: a.titulo,
    format: a.format as string,
    priceType: a.priceType as string,
    priceAmount: a.priceAmount,
    disponibilidad: a.disponibilidad ?? null,
    orientadaA: a.orientadaA,
    createdAt: a.createdAt.toISOString(),
    sesionesCompletadas: a._count.sesiones,
    user: {
      id: a.user.id,
      firstName: a.user.firstName,
      lastName: a.user.lastName,
      universidad: a.user.universidad,
    },
    rating: ratingMap[a.userId] ?? null,
  }));

  return <AyudantiasV4Client ayudantias={serialized} />;
}
