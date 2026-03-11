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

export async function GET() {
  const adminId = await checkAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const slides = await prisma.heroSlide.findMany({
    include: {
      anunciante: { select: { nombre: true } },
      diarioPost: { select: { titulo: true } },
      _count: { select: { eventos: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(slides);
}

export async function POST(request: Request) {
  const adminId = await checkAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    origen = "editorial",
    tipo,
    imagenUrl,
    imagenPosicion = "center",
    overlayOpacidad = 0.45,
    titulo,
    subtitulo,
    ctaTexto = "Ver más",
    ctaUrl,
    ctaExterno = false,
    diarioPostId,
    anuncianteId,
    precioPactado,
    tipoCobro,
    ubicaciones = ["dashboard"],
    estado = "borrador",
    fechaInicio,
    fechaFin,
    orden = 0,
  } = body;

  // Validaciones
  if (!titulo || titulo.length > 80) {
    return NextResponse.json(
      { error: "Título requerido (máx 80 caracteres)" },
      { status: 400 }
    );
  }
  if (subtitulo && subtitulo.length > 200) {
    return NextResponse.json(
      { error: "Subtítulo máx 200 caracteres" },
      { status: 400 }
    );
  }
  if (!imagenUrl) {
    return NextResponse.json(
      { error: "Imagen requerida" },
      { status: 400 }
    );
  }
  if (!ctaUrl) {
    return NextResponse.json(
      { error: "URL destino requerida" },
      { status: 400 }
    );
  }
  if (origen === "publicitario" && !anuncianteId) {
    return NextResponse.json(
      { error: "Anunciante requerido para slides publicitarios" },
      { status: 400 }
    );
  }

  // Auto-activar si corresponde
  let estadoFinal = estado;
  const inicio = fechaInicio ? new Date(fechaInicio) : new Date();
  if (estadoFinal === "aprobado" && inicio <= new Date()) {
    estadoFinal = "activo";
  }

  const slide = await prisma.heroSlide.create({
    data: {
      origen,
      tipo: tipo || "anuncio_plataforma",
      imagenUrl,
      imagenPosicion,
      overlayOpacidad: Number(overlayOpacidad),
      titulo,
      subtitulo: subtitulo || null,
      ctaTexto,
      ctaUrl,
      ctaExterno,
      diarioPostId: diarioPostId || null,
      anuncianteId: anuncianteId || null,
      precioPactado: precioPactado ? Number(precioPactado) : null,
      tipoCobro: tipoCobro || null,
      ubicaciones,
      estado: estadoFinal,
      fechaInicio: inicio,
      fechaFin: fechaFin ? new Date(fechaFin) : null,
      orden: Number(orden),
    },
  });

  return NextResponse.json(slide, { status: 201 });
}
