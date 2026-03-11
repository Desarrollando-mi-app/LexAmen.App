import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["sistema", "contenido", "otro"];

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { sesionId, tipo, descripcion } = await request.json();

  if (!sesionId || !tipo) {
    return NextResponse.json(
      { error: "Faltan campos requeridos" },
      { status: 400 }
    );
  }

  if (!TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json(
      { error: "Tipo de reporte no válido" },
      { status: 400 }
    );
  }

  // Verificar que la sesión existe y pertenece al usuario
  const sesion = await prisma.simulacroSesion.findUnique({
    where: { id: sesionId },
    select: { userId: true },
  });

  if (!sesion || sesion.userId !== authUser.id) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 }
    );
  }

  // Limitar: máximo 3 reportes por sesión
  const reportesExistentes = await prisma.simulacroReporte.count({
    where: { sesionId, userId: authUser.id },
  });

  if (reportesExistentes >= 3) {
    return NextResponse.json(
      { error: "Ya enviaste el máximo de reportes para esta sesión" },
      { status: 400 }
    );
  }

  const reporte = await prisma.simulacroReporte.create({
    data: {
      sesionId,
      userId: authUser.id,
      tipo,
      descripcion: descripcion?.trim().slice(0, 500) || null,
    },
  });

  return NextResponse.json({ id: reporte.id });
}
