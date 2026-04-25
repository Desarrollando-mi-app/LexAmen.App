import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OfertasV4Client } from "./ofertas-v4-client";
import type { OfertaTileData } from "@/lib/ofertas-helpers";

export const metadata = {
  title: "Ofertas laborales — Studio Iuris",
};

/**
 * Listado público V4 editorial de ofertas laborales.
 * Solo lectura. La gestión (crear/editar/eliminar mis propias ofertas)
 * vive en /ofertas/gestion.
 */
export default async function OfertasPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const ofertas = await prisma.ofertaTrabajo.findMany({
    where: { isActive: true, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const serialized: OfertaTileData[] = ofertas.map((o) => ({
    id: o.id,
    userId: o.userId,
    empresa: o.empresa,
    cargo: o.cargo,
    areaPractica: o.areaPractica,
    ciudad: o.ciudad,
    formato: o.formato,
    tipoContrato: o.tipoContrato,
    experienciaReq: o.experienciaReq,
    remuneracion: o.remuneracion,
    createdAt: o.createdAt.toISOString(),
  }));

  return <OfertasV4Client ofertas={serialized} />;
}
