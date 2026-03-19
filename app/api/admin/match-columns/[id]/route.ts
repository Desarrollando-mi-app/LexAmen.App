import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
 * PATCH /api/admin/match-columns/[id] — update a match-columns item
 */
export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  const { id } = params;

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data: Record<string, any> = {};
    if (body.titulo !== undefined) data.titulo = body.titulo as string;
    if (body.instruccion !== undefined)
      data.instruccion = (body.instruccion as string) || null;
    if (body.pares !== undefined) {
      // Validate pares JSON
      try {
        const parsed = JSON.parse(body.pares as string);
        if (!Array.isArray(parsed) || parsed.length < 2) {
          return NextResponse.json(
            { error: "pares debe ser un arreglo con al menos 2 pares" },
            { status: 400 },
          );
        }
      } catch {
        return NextResponse.json(
          { error: "pares debe ser un JSON valido" },
          { status: 400 },
        );
      }
      data.pares = body.pares as string;
    }
    if (body.columnaIzqLabel !== undefined)
      data.columnaIzqLabel = body.columnaIzqLabel as string;
    if (body.columnaDerLabel !== undefined)
      data.columnaDerLabel = body.columnaDerLabel as string;
    if (body.explicacion !== undefined)
      data.explicacion = (body.explicacion as string) || null;
    if (body.rama !== undefined && body.rama)
      data.rama = body.rama as string;
    if (body.libro !== undefined)
      data.libro = (body.libro as string) || null;
    if (body.tituloMateria !== undefined)
      data.tituloMateria = (body.tituloMateria as string) || null;
    if (body.materia !== undefined)
      data.materia = (body.materia as string) || null;
    if (body.dificultad !== undefined)
      data.dificultad = body.dificultad as number;
    if (body.activo !== undefined) data.activo = body.activo as boolean;

    const item = await prisma.matchColumns.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Item no encontrado" },
      { status: 404 },
    );
  }
}

/**
 * DELETE /api/admin/match-columns/[id] — delete a match-columns item
 */
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = params;

  try {
    await prisma.matchColumns.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Item no encontrado" },
      { status: 404 },
    );
  }
}
