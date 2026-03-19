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
 * PATCH /api/admin/error-identification/[id] — update an error-identification item
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

    if (body.segmentos !== undefined) {
      // Validate segmentos JSON and regenerate textoConErrores
      let segmentos: Array<{ texto: string }>;
      try {
        segmentos = JSON.parse(body.segmentos as string);
      } catch {
        return NextResponse.json({ error: "segmentos debe ser un JSON válido" }, { status: 400 });
      }
      data.segmentos = body.segmentos as string;
      data.textoConErrores = segmentos.map((s) => s.texto).join("");
    }

    if (body.totalErrores !== undefined) data.totalErrores = body.totalErrores as number;
    if (body.rama !== undefined && body.rama) data.rama = body.rama as string;
    if (body.explicacionGeneral !== undefined) data.explicacionGeneral = (body.explicacionGeneral as string) || null;
    if (body.libro !== undefined) data.libro = (body.libro as string) || null;
    if (body.titulo !== undefined) data.titulo = (body.titulo as string) || null;
    if (body.materia !== undefined) data.materia = (body.materia as string) || null;
    if (body.dificultad !== undefined) data.dificultad = body.dificultad as number;
    if (body.activo !== undefined) data.activo = body.activo as boolean;

    const item = await prisma.errorIdentification.update({
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
 * DELETE /api/admin/error-identification/[id] — delete an error-identification item
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
    await prisma.errorIdentification.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Item no encontrado" },
      { status: 404 }
    );
  }
}
