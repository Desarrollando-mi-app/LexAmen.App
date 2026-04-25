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
    const {
      estado, destacada, categoria, rama, notasAdmin, titulo, comentarioAdmin,
      contenido, pinnedTop, pinnedUntil, // V4 — contenido completo y pinning
    } = body;

    const data: Record<string, unknown> = {};
    if (estado !== undefined) data.estado = estado;
    if (destacada !== undefined) data.destacada = destacada;
    if (categoria !== undefined) data.categoria = categoria;
    if (rama !== undefined) data.rama = rama;
    if (notasAdmin !== undefined) data.notasAdmin = notasAdmin;
    if (titulo !== undefined) data.titulo = titulo;
    if (comentarioAdmin !== undefined) data.comentarioAdmin = comentarioAdmin;
    if (contenido !== undefined) data.contenido = contenido;
    if (pinnedTop !== undefined) data.pinnedTop = !!pinnedTop;
    if (pinnedUntil !== undefined) {
      data.pinnedUntil = pinnedUntil ? new Date(pinnedUntil) : null;
    }

    // Cuando se aprueba: setear metadata + reglas de pinning según categoría.
    //   editorial          → pinnedTop=true (queda arriba hasta retiro/reemplazo)
    //   columna_opinion    → pinnedUntil = +7 días
    //   carta_director     → pinnedUntil = +7 días
    //   otra categoría     → no pinning
    // Solo se aplica si el llamado no especificó pinning manual en este PATCH.
    if (estado === "aprobada") {
      const now = new Date();
      data.fechaAprobacion = now;
      data.aprobadaPor = `${admin.firstName} ${admin.lastName}`;

      // Buscamos la categoría final (la del PATCH o la actual del registro).
      const finalCategoria =
        categoria !== undefined
          ? categoria
          : (await prisma.noticiaJuridica.findUnique({
              where: { id },
              select: { categoria: true },
            }))?.categoria;

      if (finalCategoria === "editorial") {
        if (pinnedTop === undefined) data.pinnedTop = true;

        // Editoriales son únicas: al subir una nueva, despinneamos las anteriores.
        if ((pinnedTop === undefined || pinnedTop === true)) {
          await prisma.noticiaJuridica.updateMany({
            where: {
              id: { not: id },
              categoria: "editorial",
              pinnedTop: true,
            },
            data: { pinnedTop: false },
          });
        }
      } else if (finalCategoria === "columna_opinion" || finalCategoria === "carta_director") {
        if (pinnedUntil === undefined) {
          data.pinnedUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        }
      }
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
      pinnedUntil: noticia.pinnedUntil?.toISOString() ?? null,
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
