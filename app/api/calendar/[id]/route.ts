import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// PATCH /api/calendar/[id]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id } });

  if (!event) {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }

  if (event.userId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    eventType?: string;
    startDate?: string;
    endDate?: string | null;
    allDay?: boolean;
    color?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const updated = await prisma.calendarEvent.update({
    where: { id },
    data: {
      ...(body.title !== undefined && { title: body.title }),
      ...(body.description !== undefined && { description: body.description }),
      ...(body.eventType !== undefined && { eventType: body.eventType }),
      ...(body.startDate !== undefined && {
        startDate: new Date(body.startDate),
      }),
      ...(body.endDate !== undefined && {
        endDate: body.endDate ? new Date(body.endDate) : null,
      }),
      ...(body.allDay !== undefined && { allDay: body.allDay }),
      ...(body.color !== undefined && { color: body.color }),
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/calendar/[id]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const event = await prisma.calendarEvent.findUnique({ where: { id } });

  if (!event) {
    return NextResponse.json(
      { error: "Evento no encontrado" },
      { status: 404 }
    );
  }

  if (event.userId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  await prisma.calendarEvent.delete({ where: { id } });

  return NextResponse.json({ success: true });
}
