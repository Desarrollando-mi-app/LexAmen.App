import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function getAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) return null;

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true, id: true, firstName: true, lastName: true },
  });

  if (!admin?.isAdmin) return null;
  return admin;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { estado, destacada, categoria, rama, notasAdmin } = body;

    const data: Record<string, unknown> = {};
    if (estado !== undefined) data.estado = estado;
    if (destacada !== undefined) data.destacada = destacada;
    if (categoria !== undefined) data.categoria = categoria;
    if (rama !== undefined) data.rama = rama;
    if (notasAdmin !== undefined) data.notasAdmin = notasAdmin;

    // When approving, set approval metadata
    if (estado === "aprobada") {
      data.fechaAprobacion = new Date();
      data.aprobadaPor = `${admin.firstName} ${admin.lastName}`;
    }

    const noticia = await prisma.noticiaJuridica.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      ...noticia,
      fechaPublicacionFuente: noticia.fechaPublicacionFuente?.toISOString() ?? null,
      fechaRecopilacion: noticia.fechaRecopilacion.toISOString(),
      fechaAprobacion: noticia.fechaAprobacion?.toISOString() ?? null,
      createdAt: noticia.createdAt.toISOString(),
      updatedAt: noticia.updatedAt.toISOString(),
    });
  } catch {
    return NextResponse.json(
      { error: "Error al actualizar noticia" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const admin = await getAdmin();
  if (!admin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const { id } = await params;

  try {
    await prisma.noticiaJuridica.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json(
      { error: "Error al eliminar noticia" },
      { status: 500 },
    );
  }
}
