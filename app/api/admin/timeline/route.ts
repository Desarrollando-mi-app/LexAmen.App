import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** Verify admin role */
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!dbUser || !dbUser.isAdmin) return null;
  return authUser.id;
}

/**
 * GET /api/admin/timeline — list all timeline items
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const items = await prisma.timeline.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/admin/timeline — create a new timeline item
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    titulo: string;
    instruccion?: string;
    eventos: string;
    escala?: string;
    rangoMin?: number;
    rangoMax: number;
    explicacion?: string;
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

  if (!body.titulo || !body.eventos || !body.rama || body.rangoMax === undefined) {
    return NextResponse.json(
      { error: "titulo, eventos, rama y rangoMax son requeridos" },
      { status: 400 },
    );
  }

  // Validate eventos JSON
  try {
    const parsed = JSON.parse(body.eventos);
    if (!Array.isArray(parsed)) {
      return NextResponse.json(
        { error: "eventos debe ser un arreglo JSON" },
        { status: 400 },
      );
    }
    for (const item of parsed) {
      if (item.id === undefined || !item.texto || item.posicion === undefined) {
        return NextResponse.json(
          { error: "Cada evento necesita id, texto y posicion" },
          { status: 400 },
        );
      }
    }
  } catch {
    return NextResponse.json(
      { error: "eventos debe ser un JSON valido" },
      { status: 400 },
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const item = await prisma.timeline.create({
    data: {
      titulo: body.titulo,
      instruccion: body.instruccion || null,
      eventos: body.eventos,
      escala: body.escala || "dias",
      rangoMin: body.rangoMin ?? 0,
      rangoMax: body.rangoMax,
      explicacion: body.explicacion || null,
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
