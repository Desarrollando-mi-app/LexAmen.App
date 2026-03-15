import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sesionId: string }> }
) {
  const { sesionId } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { rating, comentario } = body;

  if (!rating || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Rating debe ser entre 1 y 5" }, { status: 400 });
  }

  const sesion = await prisma.ayudantiaSesion.findUnique({
    where: { id: sesionId },
    include: {
      tutor: { select: { id: true, firstName: true } },
      estudiante: { select: { id: true, firstName: true } },
    },
  });

  if (!sesion) {
    return NextResponse.json({ error: "Sesión no encontrada" }, { status: 404 });
  }

  if (sesion.status !== "completada") {
    return NextResponse.json({ error: "Solo puedes evaluar sesiones completadas" }, { status: 400 });
  }

  const isParticipant = sesion.tutorId === authUser.id || sesion.estudianteId === authUser.id;
  if (!isParticipant) {
    return NextResponse.json({ error: "No eres participante de esta sesión" }, { status: 403 });
  }

  // Check if already evaluated
  const existing = await prisma.ayudantiaEvaluacion.findUnique({
    where: { sesionId_evaluadorId: { sesionId, evaluadorId: authUser.id } },
  });
  if (existing) {
    return NextResponse.json({ error: "Ya evaluaste esta sesión" }, { status: 400 });
  }

  // Determine who is being evaluated
  const evaluadoId = authUser.id === sesion.tutorId ? sesion.estudianteId : sesion.tutorId;

  const currentName = authUser.id === sesion.tutorId
    ? sesion.tutor.firstName
    : sesion.estudiante.firstName;

  const evaluacion = await prisma.ayudantiaEvaluacion.create({
    data: {
      sesionId,
      evaluadorId: authUser.id,
      evaluadoId,
      rating: Math.round(rating),
      comentario: comentario?.trim() || null,
    },
  });

  // Notify the evaluated person
  const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
  await sendNotification({
    type: "SYSTEM_INDIVIDUAL",
    title: "Nueva evaluación recibida",
    body: `${currentName} te evaluó con ${stars}`,
    targetUserId: evaluadoId,
    metadata: { sesionId, rating },
  });

  return NextResponse.json({ evaluacion });
}
