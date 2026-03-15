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

  let body: { motivo: string; descripcion?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { motivo, descripcion } = body;

  if (!motivo || !MOTIVOS_VALIDOS.includes(motivo)) {
    return NextResponse.json({ error: "Motivo no válido" }, { status: 400 });
  }

  // Check pasantia exists
  const pasantia = await prisma.pasantia.findUnique({
    where: { id },
    select: { id: true, userId: true },
  });

  if (!pasantia) {
    return NextResponse.json({ error: "Pasantía no encontrada" }, { status: 404 });
  }

  // Can't report own publication
  if (pasantia.userId === authUser.id) {
    return NextResponse.json(
      { error: "No puedes reportar tu propia publicación" },
      { status: 400 }
    );
  }

  // Can't report twice
  const existingReport = await prisma.salaReporte.findFirst({
    where: { userId: authUser.id, pasantiaId: id },
  });

  if (existingReport) {
    return NextResponse.json(
      { error: "Ya reportaste esta publicación" },
      { status: 400 }
    );
  }

  // Create report
  const reporte = await prisma.salaReporte.create({
    data: {
      userId: authUser.id,
      pasantiaId: id,
      motivo,
      descripcion: descripcion?.trim() || null,
    },
  });

  // Check auto-hide threshold
  const result = await checkAndAutoHide({ pasantiaId: id });

  return NextResponse.json({ reporte, hidden: result.hidden });
}
