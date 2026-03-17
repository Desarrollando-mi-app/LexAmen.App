import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = params;
    const body = await request.json();

    const data: Record<string, unknown> = {};
    if (body.nombre !== undefined) data.nombre = body.nombre;
    if (body.titulo !== undefined) data.titulo = body.titulo;
    if (body.descripcion !== undefined) data.descripcion = body.descripcion;
    if (body.imagenUrl !== undefined) data.imagenUrl = body.imagenUrl;
    if (body.linkUrl !== undefined) data.linkUrl = body.linkUrl;
    if (body.posicion !== undefined) data.posicion = body.posicion;
    if (body.activo !== undefined) data.activo = body.activo;
    if (body.fechaInicio !== undefined)
      data.fechaInicio = body.fechaInicio ? new Date(body.fechaInicio) : null;
    if (body.fechaFin !== undefined)
      data.fechaFin = body.fechaFin ? new Date(body.fechaFin) : null;

    const sponsor = await prisma.sponsorBanner.update({
      where: { id },
      data,
    });

    return NextResponse.json(sponsor);
  } catch (error) {
    console.error("Error actualizando sponsor:", error);
    return NextResponse.json(
      { error: "Error al actualizar sponsor" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();
    if (!authUser)
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });

    const user = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });
    if (!user?.isAdmin)
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });

    const { id } = params;

    await prisma.sponsorBanner.delete({
      where: { id },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error eliminando sponsor:", error);
    return NextResponse.json(
      { error: "Error al eliminar sponsor" },
      { status: 500 }
    );
  }
}
