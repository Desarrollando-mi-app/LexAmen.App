import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PasantiasV4Client } from "./pasantias-client";

export const metadata = {
  title: "Pasantías — Studio Iuris",
};

/**
 * Listado público de pasantías (vista V4 editorial).
 * Trae AMBOS tipos: "ofrezco" (estudios que publican pasantías) y
 * "busco" (estudiantes que publican buscando pasantía).
 * La gestión de publicaciones propias + postulaciones vive en /pasantias/gestion.
 */
export default async function PasantiasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const pasantias = await prisma.pasantia.findMany({
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
      estudio: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          logoUrl: true,
          verificado: true,
        },
      },
    },
  });

  const serialized = pasantias.map((p) => ({
    id: p.id,
    type: (p.type === "busco" ? "busco" : "ofrezco") as "ofrezco" | "busco",
    titulo: p.titulo,
    empresa: p.empresa,
    areaPractica: p.areaPractica,
    ciudad: p.ciudad,
    formato: p.formato,
    jornada: p.jornada ?? null,
    remuneracion: p.remuneracion,
    montoRemu: p.montoRemu ?? null,
    fechaLimite: p.fechaLimite ? p.fechaLimite.toISOString() : null,
    cupos: p.cupos ?? null,
    createdAt: p.createdAt.toISOString(),
    user: {
      id: p.user.id,
      firstName: p.user.firstName,
      lastName: p.user.lastName,
      universidad: p.user.universidad,
    },
    estudio: p.estudio
      ? {
          id: p.estudio.id,
          slug: p.estudio.slug,
          nombre: p.estudio.nombre,
          logoUrl: p.estudio.logoUrl,
          verificado: p.estudio.verificado,
        }
      : null,
  }));

  return <PasantiasV4Client pasantias={serialized} />;
}
