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
 * GET /api/admin/definiciones — list all definitions
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const definiciones = await prisma.definicion.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { intentos: true } } },
  });

  return NextResponse.json({ definiciones });
}

/**
 * POST /api/admin/definiciones — create a new definition
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    concepto: string;
    definicion: string;
    distractor1: string;
    distractor2: string;
    distractor3: string;
    rama?: string;
    libro?: string;
    titulo?: string;
    explicacion?: string;
    articuloRef?: string;
    isActive?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  if (
    !body.concepto ||
    !body.definicion ||
    !body.distractor1 ||
    !body.distractor2 ||
    !body.distractor3 ||
    !body.rama
  ) {
    return NextResponse.json(
      { error: "concepto, definicion, rama, distractor1, distractor2 y distractor3 son requeridos" },
      { status: 400 }
    );
  }

  /* eslint-disable @typescript-eslint/no-explicit-any */
  const definicion = await prisma.definicion.create({
    data: {
      concepto: body.concepto,
      definicion: body.definicion,
      distractor1: body.distractor1,
      distractor2: body.distractor2,
      distractor3: body.distractor3,
      rama: body.rama as any,
      libro: body.libro || null,
      titulo: body.titulo || null,
      explicacion: body.explicacion || null,
      articuloRef: body.articuloRef || null,
      isActive: body.isActive ?? true,
    },
  });

  return NextResponse.json({ definicion }, { status: 201 });
}
