import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { EventosAdminClient } from "./eventos-client";

export default async function AdminEventosPage() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({ where: { id: authUser.id }, select: { isAdmin: true } });
  if (!admin?.isAdmin) redirect("/dashboard");

  const eventos = await prisma.eventoAcademico.findMany({
    where: { approvalStatus: "pendiente", isActive: true },
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { firstName: true, lastName: true } },
    },
  });

  const serialized = eventos.map((e) => ({
    id: e.id,
    titulo: e.titulo,
    descripcion: e.descripcion,
    organizador: e.organizador,
    fecha: e.fecha.toISOString(),
    fechaFin: e.fechaFin?.toISOString() ?? null,
    hora: e.hora,
    formato: e.formato,
    lugar: e.lugar,
    linkOnline: e.linkOnline,
    costo: e.costo,
    montoCosto: e.montoCosto,
    linkInscripcion: e.linkInscripcion,
    materias: e.materias,
    createdAt: e.createdAt.toISOString(),
    user: e.user,
  }));

  return <EventosAdminClient eventos={serialized} />;
}
