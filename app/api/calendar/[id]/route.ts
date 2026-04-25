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
    description?: string | null;
    eventType?: string;
    startDate?: string;
    endDate?: string | null;
    allDay?: boolean;
    color?: string | null;
    location?: string | null;
    url?: string | null;
    recurrence?: string | null;
    reminderMinutes?: number | null;
    materia?: string | null;
    attendees?: string | null;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // NOTA TRANSICIONAL: campos extendidos sólo se incluyen si el body
  // los provee != null, para evitar crashear cuando la migración
  // 20260425_calendar_event_extended_fields no esté aplicada.
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
      ...(body.location != null && { location: body.location }),
      ...(body.url != null && { url: body.url }),
      ...(body.recurrence != null && { recurrence: body.recurrence }),
      ...(body.reminderMinutes != null && {
        reminderMinutes: body.reminderMinutes,
      }),
      ...(body.materia != null && { materia: body.materia }),
      ...(body.attendees != null && { attendees: body.attendees }),
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
