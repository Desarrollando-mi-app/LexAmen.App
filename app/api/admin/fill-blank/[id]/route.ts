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
 * PATCH /api/admin/fill-blank/[id] — update a fill-blank item
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
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { id } = params;

  try {
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const data: Record<string, any> = {};
    if (body.textoConBlancos !== undefined) data.textoConBlancos = body.textoConBlancos as string;
    if (body.blancos !== undefined) {
      // Validate blancos JSON
      try {
        JSON.parse(body.blancos as string);
      } catch {
        return NextResponse.json({ error: "blancos debe ser un JSON válido" }, { status: 400 });
      }
      data.blancos = body.blancos as string;
    }
    if (body.rama !== undefined && body.rama) data.rama = body.rama as string;
    if (body.explicacion !== undefined) data.explicacion = (body.explicacion as string) || null;
    if (body.libro !== undefined) data.libro = (body.libro as string) || null;
    if (body.titulo !== undefined) data.titulo = (body.titulo as string) || null;
    if (body.materia !== undefined) data.materia = (body.materia as string) || null;
    if (body.dificultad !== undefined) data.dificultad = body.dificultad as number;
    if (body.activo !== undefined) data.activo = body.activo as boolean;

    const item = await prisma.fillBlank.update({
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
 * DELETE /api/admin/fill-blank/[id] — delete a fill-blank item
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
    await prisma.fillBlank.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Item no encontrado" },
      { status: 404 }
    );
  }
}
