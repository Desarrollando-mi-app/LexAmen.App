import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const fuente = searchParams.get("fuente");
    const categoria = searchParams.get("categoria");
    const destacada = searchParams.get("destacada");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));

    const where: Record<string, unknown> = { estado: "aprobada" };
    if (fuente) where.fuente = fuente;
    if (categoria) where.categoria = categoria;
    if (destacada === "true") where.destacada = true;

    const [noticias, total] = await Promise.all([
      prisma.noticiaJuridica.findMany({
        where,
        orderBy: { fechaAprobacion: "desc" },
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true,
          titulo: true,
          resumen: true,
          urlFuente: true,
          fuente: true,
          fuenteNombre: true,
          categoria: true,
          rama: true,
          imagenUrl: true,
          destacada: true,
          fechaPublicacionFuente: true,
          fechaAprobacion: true,
        },
      }),
      prisma.noticiaJuridica.count({ where }),
    ]);

    return NextResponse.json({
      noticias,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch {
    return NextResponse.json(
      { error: "Error al obtener noticias" },
      { status: 500 },
    );
  }
}
