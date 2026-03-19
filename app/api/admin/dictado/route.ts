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
 * GET /api/admin/dictado — list all dictados (admin)
 */
export async function GET() {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const items = await prisma.dictadoJuridico.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { attempts: true } } },
  });

  return NextResponse.json({ items });
}

/**
 * POST /api/admin/dictado — create a new dictado
 */
export async function POST(request: Request) {
  const adminId = await verifyAdmin();
  if (!adminId) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: {
    textoCompleto: string;
    titulo: string;
    rama: string;
    libro?: string;
    tituloMateria?: string;
    materia?: string;
    dificultad?: number;
    activo?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body invalido" }, { status: 400 });
  }

  if (!body.textoCompleto || !body.titulo || !body.rama) {
    return NextResponse.json(
      { error: "textoCompleto, titulo y rama son requeridos" },
      { status: 400 },
    );
  }

  const item = await prisma.dictadoJuridico.create({
    data: {
      textoCompleto: body.textoCompleto,
      titulo: body.titulo,
      rama: body.rama,
      libro: body.libro || null,
      tituloMateria: body.tituloMateria || null,
      materia: body.materia || null,
      dificultad: body.dificultad ?? 2,
      activo: body.activo ?? true,
    },
  });

  return NextResponse.json({ item }, { status: 201 });
}
