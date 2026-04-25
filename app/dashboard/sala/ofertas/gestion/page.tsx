import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { OfertasClient } from "./ofertas-client";

export const metadata = {
  title: "Gestión de ofertas — Studio Iuris",
};

/**
 * CRUD legacy de ofertas. La vista pública V4 vive en /ofertas.
 * Aquí se publica, se edita y se elimina ofertas propias, además del
 * listado general con filtros tradicionales.
 */
export default async function OfertasGestionPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const ofertas = await prisma.ofertaTrabajo.findMany({
    where: { isActive: true, isHidden: false },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
    },
  });

  const serialized = ofertas.map((o) => ({
    id: o.id,
    userId: o.userId,
    empresa: o.empresa,
    cargo: o.cargo,
    areaPractica: o.areaPractica,
    descripcion: o.descripcion,
    ciudad: o.ciudad,
    formato: o.formato,
    tipoContrato: o.tipoContrato,
    experienciaReq: o.experienciaReq,
    remuneracion: o.remuneracion,
    requisitos: o.requisitos,
    metodoPostulacion: o.metodoPostulacion,
    contactoPostulacion: o.contactoPostulacion,
    createdAt: o.createdAt.toISOString(),
    user: o.user,
  }));

  return <OfertasClient userId={authUser.id} initialOfertas={serialized} />;
}
