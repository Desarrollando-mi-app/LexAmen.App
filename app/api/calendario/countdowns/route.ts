import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/calendario/countdowns
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const countdowns = await prisma.userCountdown.findMany({
    where: { userId: authUser.id },
    orderBy: { fecha: "asc" },
  });

  return NextResponse.json(countdowns);
}

// POST /api/calendario/countdowns
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    titulo: string;
    fecha: string;
    color: string;
    isGrado?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.titulo?.trim() || !body.fecha || !body.color) {
    return NextResponse.json(
      { error: "Título, fecha y color son requeridos" },
      { status: 400 }
    );
  }

  // Si es de grado, verificar que no exista otro
  if (body.isGrado) {
    const existing = await prisma.userCountdown.findFirst({
      where: { userId: authUser.id, isGrado: true },
    });
    if (existing) {
      return NextResponse.json(
        { error: "Ya tienes un countdown de examen de grado" },
        { status: 409 }
      );
    }
  }

  const countdown = await prisma.userCountdown.create({
    data: {
      userId: authUser.id,
      titulo: body.titulo.trim(),
      fecha: new Date(body.fecha),
      color: body.color,
      isGrado: body.isGrado ?? false,
    },
  });

  return NextResponse.json(countdown, { status: 201 });
}
