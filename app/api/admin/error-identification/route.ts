import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/** Verify admin role */
async function verifyAdmin() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) return null;

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!dbUser || !dbUser.isAdmin) return null;
  return authUser.id;
}

/**
 * GET /api/admin/error-identification — list all error-identification items
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const items = await prisma.errorIdentification.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/admin/error-identification — create a new error-identification item
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    segmentos: string;
    totalErrores: number;
    rama: string;
    explicacionGeneral?: string;
    libro?: string;
    titulo?: string;
    materia?: string;
    dificultad?: number;
    activo?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (!body.segmentos || body.totalErrores === undefined || !body.rama) {
    return NextResponse.json(
      { error: "segmentos, totalErrores y rama son requeridos" },
      { status: 400 }
    );
  }

  // Validate segmentos JSON and auto-generate textoConErrores
  let segmentos: Array<{ texto: string; esError: boolean; textoCorrecto?: string; explicacion?: string }>;
  try {
    segmentos = JSON.parse(body.segmentos);
  } catch {
    return NextResponse.json(
      { error: "segmentos debe ser un JSON válido" },
      { status: 400 }
    );
  }

  const textoConErrores = segmentos.map((s) => s.texto).join("");

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const item = await prisma.errorIdentification.create({
    data: {
      textoConErrores,
      segmentos: body.segmentos,
      totalErrores: body.totalErrores,
      rama: body.rama as any,
      explicacionGeneral: body.explicacionGeneral || null,
      libro: body.libro || null,
      titulo: body.titulo || null,
      materia: body.materia || null,
      dificultad: body.dificultad ?? 2,
      activo: body.activo ?? true,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
