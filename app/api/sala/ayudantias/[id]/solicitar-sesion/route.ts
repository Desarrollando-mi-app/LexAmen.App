import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { fecha, duracionMin, materia, notas } = body;

  if (!fecha) {
    return NextResponse.json({ error: "La fecha es obligatoria" }, { status: 400 });
  }

  const fechaDate = new Date(fecha);
  if (fechaDate <= new Date()) {
    return NextResponse.json({ error: "La fecha debe ser futura" }, { status: 400 });
  }

  // Find the ayudantia
  const ayudantia = await prisma.ayudantia.findUnique({
    where: { id },
    include: { user: { select: { id: true, firstName: true, lastName: true } } },
  });

  if (!ayudantia || !ayudantia.isActive || ayudantia.isHidden) {
    return NextResponse.json({ error: "Ayudantía no encontrada" }, { status: 404 });
  }

  if (ayudantia.userId === authUser.id) {
    return NextResponse.json({ error: "No puedes solicitar sesión a tu propia ayudantía" }, { status: 400 });
  }

  // Get current user info
  const currentUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { firstName: true, lastName: true },
  });

  // Determine roles based on ayudantia type
  let tutorId: string;
  let estudianteId: string;

  if (ayudantia.type === "OFREZCO") {
    tutorId = ayudantia.userId;
    estudianteId = authUser.id;
  } else {
    // BUSCO: the person clicking is offering to help
    tutorId = authUser.id;
    estudianteId = ayudantia.userId;
  }

  const sesion = await prisma.ayudantiaSesion.create({
    data: {
      ayudantiaId: id,
      tutorId,
      estudianteId,
      fecha: fechaDate,
      duracionMin: duracionMin ? parseInt(duracionMin) : null,
      materia: materia || ayudantia.materia,
      notas: notas || null,
    },
  });

  // Notify the other user
  const targetUserId = ayudantia.userId; // always notify the ayudantia owner
  await sendNotification({
    type: "SYSTEM_INDIVIDUAL",
    title: "Nueva solicitud de sesión",
    body: `${currentUser?.firstName ?? "Alguien"} quiere agendar una sesión de ${sesion.materia}`,
    targetUserId,
    metadata: { sesionId: sesion.id, ayudantiaId: id },
  });

  return NextResponse.json({ sesion });
}
