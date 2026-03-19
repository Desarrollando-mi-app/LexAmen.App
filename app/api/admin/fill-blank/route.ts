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
 * GET /api/admin/fill-blank — list all fill-blank items
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const items = await prisma.fillBlank.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/admin/fill-blank — create a new fill-blank item
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    textoConBlancos: string;
    blancos: string;
    rama: string;
    explicacion?: string;
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

  if (!body.textoConBlancos || !body.blancos || !body.rama) {
    return NextResponse.json(
      { error: "textoConBlancos, blancos y rama son requeridos" },
      { status: 400 }
    );
  }

  // Validate blancos JSON
  try {
    JSON.parse(body.blancos);
  } catch {
    return NextResponse.json(
      { error: "blancos debe ser un JSON válido" },
      { status: 400 }
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const item = await prisma.fillBlank.create({
    data: {
      textoConBlancos: body.textoConBlancos,
      blancos: body.blancos,
      rama: body.rama as any,
      explicacion: body.explicacion || null,
      libro: body.libro || null,
      titulo: body.titulo || null,
      materia: body.materia || null,
      dificultad: body.dificultad ?? 2,
      activo: body.activo ?? true,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
