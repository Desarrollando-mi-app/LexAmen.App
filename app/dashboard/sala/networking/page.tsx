import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { NetworkingV4Client } from "./networking-v4-client";
import {
  parseEspecialidades,
  type ColegaConexion,
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

  // 1. Listado base — todas las personas activas y visibles, no me incluyo.
  const colegas = await prisma.user.findMany({
    where: {
      deletedAt: null,
      suspended: false,
      visibleEnRanking: true,
      onboardingCompleted: true,
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
      ciudad: true,
      empleoActual: true,
      cargoActual: true,
      bio: true,
      especialidades: true,
      grado: true,
      xp: true,
      createdAt: true,
    },
  });

  // 2. Estado de la relación con cada persona del feed — una sola query
  //    al modelo ColegaRequest para no hacer N+1. Tomamos la solicitud más
  //    reciente por par.
  const ids = colegas.map((c) => c.id);
  const requests =
    ids.length > 0
      ? await prisma.colegaRequest.findMany({
          where: {
            OR: [
              { senderId: authUser.id, receiverId: { in: ids } },
              { receiverId: authUser.id, senderId: { in: ids } },
            ],
          },
          orderBy: { createdAt: "desc" },
          select: {
            id: true,
            senderId: true,
            receiverId: true,
            status: true,
          },
        })
      : [];

  const conexionByUser = new Map<string, ColegaConexion>();
  for (const r of requests) {
    const otherId = r.senderId === authUser.id ? r.receiverId : r.senderId;
    if (conexionByUser.has(otherId)) continue; // ya guardamos la más reciente
    if (r.status === "ACCEPTED") {
      conexionByUser.set(otherId, "accepted");
    } else if (r.status === "REJECTED") {
      conexionByUser.set(otherId, "rejected");
    } else if (r.senderId === authUser.id) {
      conexionByUser.set(otherId, "pending_sent");
    } else {
      conexionByUser.set(otherId, "pending_received");
    }
  }

  const serialized: ColegaTileData[] = colegas.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    avatarUrl: c.avatarUrl ?? null,
    etapaActual: c.etapaActual ?? null,
    universidad: c.universidad ?? null,
    universityYear: c.universityYear ?? null,
    region: c.region ?? null,
    ciudad: c.ciudad ?? null,
    empleoActual: c.empleoActual ?? null,
    cargoActual: c.cargoActual ?? null,
    bio: c.bio ?? null,
    especialidades: parseEspecialidades(c.especialidades),
    grado: c.grado,
    xp: c.xp,
    createdAt: c.createdAt.toISOString(),
    conexion: conexionByUser.get(c.id) ?? "none",
  }));

  return <NetworkingV4Client colegas={serialized} />;
}
