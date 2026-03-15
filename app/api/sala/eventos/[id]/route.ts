import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const evento = await prisma.eventoAcademico.findUnique({
    where: { id },
    include: {
      user: {
        select: { id: true, firstName: true, lastName: true, avatarUrl: true },
      },
      _count: { select: { interesados: true } },
    },
  });

  if (!evento || !evento.isActive) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  return NextResponse.json({
    ...evento,
    interesadosCount: evento._count.interesados,
    createdAt: evento.createdAt.toISOString(),
    updatedAt: evento.updatedAt.toISOString(),
    fecha: evento.fecha.toISOString(),
    fechaFin: evento.fechaFin?.toISOString() ?? null,
    approvedAt: evento.approvedAt?.toISOString() ?? null,
  });
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const evento = await prisma.eventoAcademico.findUnique({ where: { id } });
  if (!evento || !evento.isActive) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }
  if (evento.userId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const allowed = [
    "titulo", "descripcion", "organizador", "fecha", "fechaFin",
    "hora", "formato", "lugar", "linkOnline", "costo", "montoCosto",
    "linkInscripcion", "materias",
  ];

  const data: Record<string, unknown> = {};
  for (const key of allowed) {
    if (key in body) {
      if (key === "fecha" || key === "fechaFin") {
        data[key] = body[key] ? new Date(body[key]) : null;
      } else {
        data[key] = body[key];
      }
    }
  }

  // If event was already approved, editing resets to pending
  if (evento.approvalStatus === "aprobado" && Object.keys(data).length > 0) {
    data.approvalStatus = "pendiente";
    data.approvedAt = null;
    data.approvedBy = null;
  }

  const updated = await prisma.eventoAcademico.update({
    where: { id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const evento = await prisma.eventoAcademico.findUnique({ where: { id } });
  if (!evento) {
    return NextResponse.json({ error: "Evento no encontrado" }, { status: 404 });
  }

  // Check ownership or admin
  if (evento.userId !== authUser.id) {
    const admin = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });
    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
  }

  await prisma.eventoAcademico.update({
    where: { id },
    data: { isActive: false },
  });

  return NextResponse.json({ success: true });
}
