import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NetworkingV4Client } from "./networking-v4-client";
import {
  parseEspecialidades,
  type ColegaTileData,
} from "@/lib/networking-helpers";

export const metadata = {
  title: "Networking — Studio Iuris",
  description:
    "Directorio de colegas, egresados y abogados de la comunidad Studio Iuris.",
};

/**
 * Listado público V4 editorial de colegas en la comunidad.
 * Excluye usuarios suspendidos, eliminados y los que escondieron su perfil
 * (visibleEnRanking = false). Lectura pura; el detalle vive en
 * /dashboard/perfil/[userId].
 */
export default async function NetworkingPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const colegas = await prisma.user.findMany({
    where: {
      deletedAt: null,
      suspended: false,
      visibleEnRanking: true,
      onboardingCompleted: true,
      // No me listo a mí mismo en el directorio.
      NOT: { id: authUser.id },
    },
    orderBy: [{ grado: "desc" }, { xp: "desc" }],
    take: 200,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      etapaActual: true,
      universidad: true,
      universityYear: true,
      region: true,
      empleoActual: true,
      cargoActual: true,
      bio: true,
      especialidades: true,
      grado: true,
      xp: true,
      createdAt: true,
    },
  });

  const serialized: ColegaTileData[] = colegas.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    avatarUrl: c.avatarUrl ?? null,
    etapaActual: c.etapaActual ?? null,
    universidad: c.universidad ?? null,
    universityYear: c.universityYear ?? null,
    region: c.region ?? null,
    empleoActual: c.empleoActual ?? null,
    cargoActual: c.cargoActual ?? null,
    bio: c.bio ?? null,
    especialidades: parseEspecialidades(c.especialidades),
    grado: c.grado,
    xp: c.xp,
    createdAt: c.createdAt.toISOString(),
  }));

  return <NetworkingV4Client colegas={serialized} />;
}
