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
 * GET /api/admin/match-columns — list all match-columns items
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const items = await prisma.matchColumns.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/admin/match-columns — create a new match-columns item
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    titulo: string;
    instruccion?: string;
    pares: string;
    columnaIzqLabel?: string;
    columnaDerLabel?: string;
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

  if (!body.titulo || !body.pares || !body.rama) {
    return NextResponse.json(
      { error: "titulo, pares y rama son requeridos" },
      { status: 400 },
    );
  }

  // Validate pares JSON
  try {
    const parsed = JSON.parse(body.pares);
    if (!Array.isArray(parsed) || parsed.length < 2) {
      return NextResponse.json(
        { error: "pares debe ser un arreglo con al menos 2 pares" },
        { status: 400 },
      );
    }
    for (const p of parsed) {
      if (!p.id && p.id !== 0) {
        return NextResponse.json(
          { error: "Cada par necesita un id" },
          { status: 400 },
        );
      }
      if (!p.izquierda || !p.derecha) {
        return NextResponse.json(
          { error: "Cada par necesita izquierda y derecha" },
          { status: 400 },
        );
      }
    }
  } catch {
    return NextResponse.json(
      { error: "pares debe ser un JSON valido" },
      { status: 400 },
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const item = await prisma.matchColumns.create({
    data: {
      titulo: body.titulo,
      instruccion: body.instruccion || null,
      pares: body.pares,
      columnaIzqLabel: body.columnaIzqLabel || "Concepto",
      columnaDerLabel: body.columnaDerLabel || "Definicion",
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
