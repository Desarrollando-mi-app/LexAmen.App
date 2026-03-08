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
    },
  });

  return NextResponse.json(event, { status: 201 });
}
