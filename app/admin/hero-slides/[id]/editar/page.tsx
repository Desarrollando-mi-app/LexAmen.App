import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { HeroSlideForm } from "../../hero-slide-form";

export default async function EditarSlidePage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) redirect("/login");

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!admin?.isAdmin) redirect("/dashboard");

  const slide = await prisma.heroSlide.findUnique({
    where: { id: params.id },
  });

  if (!slide) redirect("/admin/hero-slides");

  const initialData = {
    id: slide.id,
    origen: slide.origen,
    tipo: slide.tipo,
    imagenUrl: slide.imagenUrl,
    imagenPosicion: slide.imagenPosicion,
    overlayOpacidad: slide.overlayOpacidad,
    titulo: slide.titulo,
    subtitulo: slide.subtitulo || "",
    ctaTexto: slide.ctaTexto,
    ctaUrl: slide.ctaUrl,
    ctaExterno: slide.ctaExterno,
    anuncianteId: slide.anuncianteId || "",
    precioPactado: slide.precioPactado?.toString() || "",
    tipoCobro: slide.tipoCobro || "",
    ubicaciones: slide.ubicaciones,
    estado: slide.estado,
    fechaInicio: slide.fechaInicio.toISOString().slice(0, 16),
    fechaFin: slide.fechaFin?.toISOString().slice(0, 16) || "",
    sinFechaFin: !slide.fechaFin,
    orden: slide.orden.toString(),
  };

  return <HeroSlideForm initialData={initialData} isEdit />;
}
