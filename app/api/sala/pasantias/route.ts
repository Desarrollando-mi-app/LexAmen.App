import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  AREAS_PRACTICA,
  FORMATOS_TRABAJO,
  REMUNERACION_OPTIONS,
} from "@/lib/sala-constants";

const validAreas: string[] = AREAS_PRACTICA.map((a) => a.value);
const validFormatos: string[] = FORMATOS_TRABAJO.map((f) => f.value);
const validRemuneracion: string[] = REMUNERACION_OPTIONS.map((r) => r.value);

// ─── GET: Listar pasantías ───────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const areaPractica = searchParams.get("areaPractica");
  const ciudad = searchParams.get("ciudad");
  const formato = searchParams.get("formato");
  const remuneracion = searchParams.get("remuneracion");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  const where: Record<string, unknown> = { isActive: true, isHidden: false };

  if (areaPractica) where.areaPractica = areaPractica;
  if (ciudad) where.ciudad = ciudad;
  if (formato) where.formato = formato;
  if (remuneracion) where.remuneracion = remuneracion;

  const pasantias = await prisma.pasantia.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          universidad: true,
        },
      },
    },
  });

  return NextResponse.json(pasantias);
}

// ─── POST: Crear pasantía ────────────────────────────────

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    empresa: string;
    areaPractica: string;
    titulo: string;
    descripcion: string;
    ciudad: string;
    formato: string;
    duracion?: string;
    remuneracion: string;
    montoRemu?: number;
    requisitos?: string;
    metodoPostulacion: string;
    contactoPostulacion?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const {
    empresa,
    areaPractica,
    titulo,
    descripcion,
    ciudad,
    formato,
    duracion,
    remuneracion,
    montoRemu,
    requisitos,
    metodoPostulacion,
    contactoPostulacion,
  } = body;

  // Validaciones
  if (!empresa?.trim()) {
    return NextResponse.json({ error: "Empresa es requerida" }, { status: 400 });
  }
  if (!titulo?.trim()) {
    return NextResponse.json({ error: "Título es requerido" }, { status: 400 });
  }
  if (!descripcion?.trim()) {
    return NextResponse.json({ error: "Descripción es requerida" }, { status: 400 });
  }
  if (!metodoPostulacion?.trim()) {
    return NextResponse.json({ error: "Método de postulación es requerido" }, { status: 400 });
  }
  if (!areaPractica || !validAreas.includes(areaPractica)) {
    return NextResponse.json({ error: "Área de práctica no válida" }, { status: 400 });
  }
  if (!formato || !validFormatos.includes(formato)) {
    return NextResponse.json({ error: "Formato de trabajo no válido" }, { status: 400 });
  }
  if (!remuneracion || !validRemuneracion.includes(remuneracion)) {
    return NextResponse.json({ error: "Opción de remuneración no válida" }, { status: 400 });
  }

  const pasantia = await prisma.pasantia.create({
    data: {
      userId: authUser.id,
      empresa: empresa.trim(),
      areaPractica,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      ciudad: ciudad?.trim() || "",
      formato,
      duracion: duracion?.trim() || null,
      remuneracion,
      montoRemu: montoRemu != null ? String(montoRemu) : null,
      requisitos: requisitos?.trim() || null,
      metodoPostulacion: metodoPostulacion.trim(),
      contactoPostulacion: contactoPostulacion?.trim() || null,
      isActive: true,
      isHidden: false,
    },
  });

  return NextResponse.json(pasantia, { status: 201 });
}
