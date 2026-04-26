import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const TIPOS_VALIDOS = ["estudiantil", "profesional", "academico", "personal"] as const;

// GET /api/perfil/hitos — lista hitos del usuario autenticado.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const hitos = await prisma.userHito.findMany({
    where: { userId: authUser.id },
    orderBy: { fecha: "desc" },
  });

  return NextResponse.json(
    hitos.map((h) => ({
      ...h,
      fecha: h.fecha.toISOString(),
      createdAt: h.createdAt.toISOString(),
      updatedAt: h.updatedAt.toISOString(),
    }))
  );
}

// POST /api/perfil/hitos — crear nuevo hito.
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    tipo: string;
    titulo: string;
    descripcion?: string | null;
    institucion?: string | null;
    fecha: string; // ISO o yyyy-mm-dd o solo año "2024"
    esActual?: boolean;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  // Validaciones
  if (!body.titulo || body.titulo.trim().length < 2) {
    return NextResponse.json(
      { error: "El título es requerido (mínimo 2 caracteres)" },
      { status: 400 }
    );
  }
  if (!body.tipo || !TIPOS_VALIDOS.includes(body.tipo as (typeof TIPOS_VALIDOS)[number])) {
    return NextResponse.json(
      { error: "Tipo inválido (estudiantil/profesional/academico/personal)" },
      { status: 400 }
    );
  }

  const fecha = parseFecha(body.fecha);
  if (!fecha) {
    return NextResponse.json(
      { error: "Fecha inválida (usa formato yyyy-mm-dd o solo año yyyy)" },
      { status: 400 }
    );
  }

  const hito = await prisma.userHito.create({
    data: {
      userId: authUser.id,
      tipo: body.tipo,
      titulo: body.titulo.trim(),
      descripcion: body.descripcion?.trim() || null,
      institucion: body.institucion?.trim() || null,
      fecha,
      esActual: !!body.esActual,
    },
  });

  return NextResponse.json(
    {
      ...hito,
      fecha: hito.fecha.toISOString(),
      createdAt: hito.createdAt.toISOString(),
      updatedAt: hito.updatedAt.toISOString(),
    },
    { status: 201 }
  );
}

// Acepta "yyyy" (solo año), "yyyy-mm" o "yyyy-mm-dd" o ISO completo.
function parseFecha(input: string): Date | null {
  if (!input) return null;
  // Solo año: "2024" → 1 de enero
  if (/^\d{4}$/.test(input)) {
    return new Date(`${input}-01-01T12:00:00.000Z`);
  }
  // Año-mes: "2024-06" → primer día del mes
  if (/^\d{4}-\d{2}$/.test(input)) {
    return new Date(`${input}-01T12:00:00.000Z`);
  }
  // Fecha completa
  const d = new Date(input);
  if (isNaN(d.getTime())) return null;
  return d;
}
