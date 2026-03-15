import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sesiones = await prisma.ayudantiaSesion.findMany({
    where: {
      OR: [{ tutorId: authUser.id }, { estudianteId: authUser.id }],
    },
    include: {
      ayudantia: {
        select: { id: true, materia: true, titulo: true, type: true },
      },
      tutor: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      estudiante: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      evaluaciones: {
        select: { evaluadorId: true, rating: true },
      },
    },
    orderBy: { createdAt: "desc" },
  });

  const serialized = sesiones.map((s) => ({
    id: s.id,
    ayudantiaId: s.ayudantiaId,
    ayudantiaTitulo: s.ayudantia.titulo || s.ayudantia.materia,
    ayudantiaTipo: s.ayudantia.type as string,
    tutorId: s.tutorId,
    tutor: s.tutor,
    estudianteId: s.estudianteId,
    estudiante: s.estudiante,
    fecha: s.fecha.toISOString(),
    duracionMin: s.duracionMin,
    materia: s.materia,
    notas: s.notas,
    status: s.status,
    completadaAt: s.completadaAt?.toISOString() ?? null,
    canceladaAt: s.canceladaAt?.toISOString() ?? null,
    canceladaPor: s.canceladaPor,
    createdAt: s.createdAt.toISOString(),
    evaluaciones: s.evaluaciones.map((e) => ({
      evaluadorId: e.evaluadorId,
      rating: e.rating,
    })),
    myRole: s.tutorId === authUser.id ? "tutor" : "estudiante",
    hasEvaluated: s.evaluaciones.some((e) => e.evaluadorId === authUser.id),
  }));

  return NextResponse.json({ sesiones: serialized });
}
