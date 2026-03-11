import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return null;
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!user?.isAdmin) return null;
  return authUser.id;
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const adminId = await checkAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const slide = await prisma.heroSlide.findUnique({
    where: { id: params.id },
  });
  if (!slide) {
    return NextResponse.json({ error: "Slide no encontrado" }, { status: 404 });
  }

  const body = await request.json();

  // Validaciones
  if (body.titulo && body.titulo.length > 80) {
    return NextResponse.json(
      { error: "Título máx 80 caracteres" },
      { status: 400 }
    );
  }
  if (body.subtitulo && body.subtitulo.length > 200) {
    return NextResponse.json(
      { error: "Subtítulo máx 200 caracteres" },
      { status: 400 }
    );
  }

  // Si activando, verificar fechaFin
  if (body.estado === "activo") {
    const fechaFin = body.fechaFin ? new Date(body.fechaFin) : slide.fechaFin;
    if (fechaFin && fechaFin < new Date()) {
      return NextResponse.json(
        { error: "No se puede activar un slide cuya fecha de fin ya pasó" },
        { status: 400 }
      );
    }
  }

  // Construir data de update
  const data: Record<string, unknown> = {};
  const allowedFields = [
    "origen", "tipo", "imagenUrl", "imagenPosicion", "overlayOpacidad",
    "titulo", "subtitulo", "ctaTexto", "ctaUrl", "ctaExterno",
    "diarioPostId", "anuncianteId", "precioPactado", "tipoCobro",
    "ubicaciones", "estado", "fechaInicio", "fechaFin", "orden",
  ];

  for (const field of allowedFields) {
    if (body[field] !== undefined) {
      if (field === "fechaInicio" || field === "fechaFin") {
        data[field] = body[field] ? new Date(body[field]) : null;
      } else if (field === "overlayOpacidad" || field === "orden" || field === "precioPactado") {
        data[field] = body[field] !== null ? Number(body[field]) : null;
      } else {
        data[field] = body[field];
      }
    }
  }

  const updated = await prisma.heroSlide.update({
    where: { id: params.id },
    data,
  });

  return NextResponse.json(updated);
}

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const adminId = await checkAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const slide = await prisma.heroSlide.findUnique({
    where: { id: params.id },
  });
  if (!slide) {
    return NextResponse.json({ error: "Slide no encontrado" }, { status: 404 });
  }
  if (slide.estado !== "borrador") {
    return NextResponse.json(
      { error: "Solo se pueden eliminar slides en estado borrador" },
      { status: 400 }
    );
  }

  await prisma.heroSlide.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
