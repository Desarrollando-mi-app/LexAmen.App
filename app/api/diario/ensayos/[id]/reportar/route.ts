import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { checkAndAutoHide } from "@/lib/sala-reportes";

const MOTIVOS_VALIDOS = [
  "spam",
  "informacion_falsa",
  "contenido_inapropiado",
  "oferta_sospechosa",
  "otro",
];

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const body = await request.json();
  const { motivo, descripcion } = body;

  if (!motivo || !MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo no válido" }, { status: 400 });
  }

  const ensayo = await prisma.ensayo.findUnique({
    where: { id },
  });

  if (!ensayo || !ensayo.isActive) {
    return NextResponse.json(
      { error: "Ensayo no encontrado" },
      { status: 404 }
    );
  }

  if (ensayo.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes reportar tu propia publicación" },
      { status: 400 }
    );
  }

  // Check duplicate
  const existingReport = await prisma.salaReporte.findFirst({
    where: { userId: authUser.id, ensayoId: id },
  });
  if (existingReport) {
    return NextResponse.json(
      { error: "Ya reportaste esta publicación" },
      { status: 400 }
    );
  }

  const reporte = await prisma.salaReporte.create({
    data: {
      userId: authUser.id,
      ensayoId: id,
      motivo,
      descripcion: descripcion?.trim() || null,
    },
  });

  const { hidden } = await checkAndAutoHide({ ensayoId: id });

  return NextResponse.json({ reporte, hidden }, { status: 201 });
}
