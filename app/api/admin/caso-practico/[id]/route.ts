import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

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
 * PATCH /api/admin/caso-practico/[id] — update a caso practico
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
    if (body.hechos !== undefined) data.hechos = body.hechos as string;
    if (body.preguntas !== undefined) {
      // Validate preguntas JSON
      try {
        const arr = JSON.parse(body.preguntas as string);
        if (!Array.isArray(arr)) {
          return NextResponse.json(
            { error: "preguntas debe ser un array JSON" },
            { status: 400 }
          );
        }
      } catch {
        return NextResponse.json(
          { error: "preguntas debe ser un JSON valido" },
          { status: 400 }
        );
      }
      data.preguntas = body.preguntas as string;
    }
    if (body.resumenFinal !== undefined) data.resumenFinal = (body.resumenFinal as string) || null;
    if (body.rama !== undefined && body.rama) data.rama = body.rama as string;
    if (body.libro !== undefined) data.libro = (body.libro as string) || null;
    if (body.tituloMateria !== undefined) data.tituloMateria = (body.tituloMateria as string) || null;
    if (body.materia !== undefined) data.materia = (body.materia as string) || null;
    if (body.dificultad !== undefined) data.dificultad = body.dificultad as number;
    if (body.activo !== undefined) data.activo = body.activo as boolean;

    const item = await prisma.casoPractico.update({
      where: { id },
      data,
    });

    return NextResponse.json({ item });
  } catch {
    return NextResponse.json(
      { error: "Item no encontrado" },
      { status: 404 }
    );
  }
}

/**
 * DELETE /api/admin/caso-practico/[id] — delete a caso practico
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
    await prisma.casoPractico.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Item no encontrado" },
      { status: 404 }
    );
  }
}
