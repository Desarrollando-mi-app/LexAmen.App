import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { redirect } from "next/navigation";
import { EventosClient } from "./eventos-client";

export const metadata = {
  title: "Eventos Académicos — Studio Iuris",
};

export default async function EventosPage() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    redirect("/login");
  }

  const now = new Date();

  // Fetch upcoming approved events
  const eventosRaw = await prisma.eventoAcademico.findMany({
    where: {
      isActive: true,
      isHidden: false,
      approvalStatus: "aprobado",
      fecha: { gte: now },
    },
    orderBy: { fecha: "asc" },
    take: 50,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { interesados: true },
      },
    },
  });

  // Check which events the user marked interest in
  const [userInteres, calendarSourceEvents] = await Promise.all([
    prisma.eventoInteres.findMany({
      where: {
        userId: authUser.id,
        eventoId: { in: eventosRaw.map((e) => e.id) },
      },
      select: { eventoId: true },
    }),
    prisma.calendarEvent.findMany({
      where: {
        userId: authUser.id,
        sourceEventoId: { not: null },
      },
      select: { sourceEventoId: true },
    }),
  ]);
  const userInteresIds = new Set(userInteres.map((i) => i.eventoId));
  const calendarSourceIds = calendarSourceEvents
    .map((e) => e.sourceEventoId)
    .filter((id): id is string => id !== null);

  const eventos = eventosRaw.map((e) => ({
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
    approvalStatus: e.approvalStatus,
    rejectionReason: e.rejectionReason,
    interesadosCount: e._count.interesados,
    hasInteres: userInteresIds.has(e.id),
    createdAt: e.createdAt.toISOString(),
    user: {
      id: e.user.id,
      firstName: e.user.firstName,
      lastName: e.user.lastName,
      avatarUrl: e.user.avatarUrl,
    },
  }));

  return <EventosClient initialEventos={eventos} userId={authUser.id} initialCalendarSourceIds={calendarSourceIds} />;
}
