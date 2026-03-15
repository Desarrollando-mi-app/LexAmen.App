import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { PasantiasClient } from "./pasantias-client";

export const metadata = {
  title: "Pasantías — Studio Iuris",
};

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

  const serialized = pasantias.map((p) => ({
    id: p.id,
    userId: p.userId,
    empresa: p.empresa,
    areaPractica: p.areaPractica,
    titulo: p.titulo,
    descripcion: p.descripcion,
    ciudad: p.ciudad,
    formato: p.formato,
    duracion: p.duracion,
    remuneracion: p.remuneracion,
    montoRemu: p.montoRemu,
    requisitos: p.requisitos,
    metodoPostulacion: p.metodoPostulacion,
    contactoPostulacion: p.contactoPostulacion,
    createdAt: p.createdAt.toISOString(),
    user: p.user,
  }));

  return <PasantiasClient userId={authUser.id} initialPasantias={serialized} />;
}
