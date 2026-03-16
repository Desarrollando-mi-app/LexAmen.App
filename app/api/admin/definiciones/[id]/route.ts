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
 * PUT /api/admin/definiciones/[id] — update a definition
 */
export async function PUT(
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
    if (body.concepto !== undefined) data.concepto = body.concepto as string;
    if (body.definicion !== undefined) data.definicion = body.definicion as string;
    if (body.distractor1 !== undefined) data.distractor1 = body.distractor1 as string;
    if (body.distractor2 !== undefined) data.distractor2 = body.distractor2 as string;
    if (body.distractor3 !== undefined) data.distractor3 = body.distractor3 as string;
    if (body.rama !== undefined && body.rama) data.rama = body.rama as string;
    if (body.libro !== undefined) data.libro = (body.libro as string) || null;
    if (body.titulo !== undefined) data.titulo = (body.titulo as string) || null;
    if (body.explicacion !== undefined) data.explicacion = (body.explicacion as string) || null;
    if (body.articuloRef !== undefined) data.articuloRef = (body.articuloRef as string) || null;
    if (body.isActive !== undefined) data.isActive = body.isActive as boolean;

    const definicion = await prisma.definicion.update({
      where: { id },
      data,
    });

    return NextResponse.json({ definicion });
  } catch {
    return NextResponse.json(
      { error: "Definición no encontrada" },
      { status: 404 }
    );
  }
}

/**
 * DELETE /api/admin/definiciones/[id] — delete a definition
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
    await prisma.definicion.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Definición no encontrada" },
      { status: 404 }
    );
  }
}
