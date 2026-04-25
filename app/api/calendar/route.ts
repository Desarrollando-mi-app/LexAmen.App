import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/calendar?month=3&year=2026
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const month = parseInt(searchParams.get("month") ?? "");
  const year = parseInt(searchParams.get("year") ?? "");

  if (isNaN(month) || isNaN(year) || month < 1 || month > 12) {
    return NextResponse.json(
      { error: "Parámetros month y year requeridos" },
      { status: 400 }
    );
  }

  const start = new Date(year, month - 1, 1);
  const end = new Date(year, month, 0, 23, 59, 59, 999);

  const events = await prisma.calendarEvent.findMany({
    where: {
      userId: authUser.id,
      startDate: { gte: start, lte: end },
    },
    orderBy: { startDate: "asc" },
  });

  return NextResponse.json(events);
}

// POST /api/calendar
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    title: string;
    description?: string;
    eventType?: string;
    startDate: string;
    endDate?: string;
    allDay?: boolean;
    color?: string;
    sourceEventoId?: string;
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

  if (!body.title || !body.startDate) {
    return NextResponse.json(
      { error: "Título y fecha de inicio son requeridos" },
      { status: 400 }
    );
  }

  // Prevenir duplicados de eventos de La Sala
  if (body.sourceEventoId) {
    const existing = await prisma.calendarEvent.findUnique({
      where: {
        userId_sourceEventoId: {
          userId: authUser.id,
          sourceEventoId: body.sourceEventoId,
        },
      },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Este evento ya está en tu calendario", existing: true },
        { status: 409 }
      );
    }
  }

  const event = await prisma.calendarEvent.create({
    data: {
      userId: authUser.id,
      title: body.title,
      description: body.description ?? null,
      eventType: body.eventType ?? "personal",
      startDate: new Date(body.startDate),
      endDate: body.endDate ? new Date(body.endDate) : null,
      allDay: body.allDay ?? false,
      color: body.color ?? null,
      sourceEventoId: body.sourceEventoId ?? null,
      location: body.location ?? null,
      url: body.url ?? null,
      recurrence: body.recurrence ?? null,
      reminderMinutes: body.reminderMinutes ?? null,
      materia: body.materia ?? null,
      attendees: body.attendees ?? null,
    },
  });

  return NextResponse.json(event, { status: 201 });
}
