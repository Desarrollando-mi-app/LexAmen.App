import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const revalidate = 60;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const ubicacion = searchParams.get("ubicacion") || "dashboard";
  const now = new Date();

  const slides = await prisma.heroSlide.findMany({
    where: {
      estado: "activo",
      fechaInicio: { lte: now },
      OR: [{ fechaFin: null }, { fechaFin: { gte: now } }],
      ubicaciones: { has: ubicacion },
    },
    include: {
      anunciante: { select: { nombre: true } },
    },
    orderBy: { orden: "desc" },
    take: 12, // fetch extra for interleaving
  });

  // Anti-consecutivos: no permitir 2 publicitarios seguidos
  const resultado: typeof slides = [];
  const editorialesReserva = slides.filter((s) => s.origen === "editorial");
  let editorialIdx = 0;

  for (const slide of slides) {
    const prevOrigen = resultado.length > 0 ? resultado[resultado.length - 1].origen : null;
    if (slide.origen === "publicitario" && prevOrigen === "publicitario") {
      // Intercalar un editorial si hay disponible
      while (editorialIdx < editorialesReserva.length) {
        const editorial = editorialesReserva[editorialIdx];
        editorialIdx++;
        if (!resultado.find((r) => r.id === editorial.id)) {
          resultado.push(editorial);
          break;
        }
      }
    }
    if (!resultado.find((r) => r.id === slide.id)) {
      resultado.push(slide);
    }
    if (resultado.length >= 8) break;
  }

  return NextResponse.json(resultado);
}
