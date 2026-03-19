import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** Verify admin role */
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: user.id },
    select: { isAdmin: true },
  });
  return dbUser?.isAdmin ? user.id : null;
}

/**
 * GET /api/admin/caso-practico — list all casos practicos
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const items = await prisma.casoPractico.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/admin/caso-practico — create a new caso practico
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    titulo: string;
    hechos: string;
    preguntas: string;
    resumenFinal?: string;
    rama: string;
    libro?: string;
    tituloMateria?: string;
    materia?: string;
    dificultad?: number;
    activo?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  if (!body.titulo || !body.hechos || !body.preguntas || !body.rama) {
    return NextResponse.json(
      { error: "titulo, hechos, preguntas y rama son requeridos" },
      { status: 400 }
    );
  }

  // Validate preguntas JSON
  try {
    const arr = JSON.parse(body.preguntas);
    if (!Array.isArray(arr) || arr.length === 0) {
      return NextResponse.json(
        { error: "preguntas debe ser un array JSON no vacio" },
        { status: 400 }
      );
    }
  } catch {
    return NextResponse.json(
      { error: "preguntas debe ser un JSON valido" },
      { status: 400 }
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const item = await prisma.casoPractico.create({
    data: {
      titulo: body.titulo,
      hechos: body.hechos,
      preguntas: body.preguntas,
      resumenFinal: body.resumenFinal || null,
      rama: body.rama as any,
      libro: body.libro || null,
      tituloMateria: body.tituloMateria || null,
      materia: body.materia || null,
      dificultad: body.dificultad ?? 2,
      activo: body.activo ?? true,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
