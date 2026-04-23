import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  AREAS_PRACTICA,
  FORMATOS_TRABAJO,
  REMUNERACION_OPTIONS,
} from "@/lib/sala-constants";
import { PASANTIA_JORNADAS } from "@/lib/pasantias-helpers";

const validAreas: string[] = AREAS_PRACTICA.map((a) => a.value);
const validFormatos: string[] = FORMATOS_TRABAJO.map((f) => f.value);
const validRemuneracion: string[] = REMUNERACION_OPTIONS.map((r) => r.value);
const validJornadas: string[] = PASANTIA_JORNADAS.map((j) => j.value);
const validTipos = new Set(["ofrezco", "busco"]);
const validPostulacionTipos = new Set(["INTERNA", "EXTERNA"]);

// ─── GET: Listar pasantías ───────────────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type");
  const areaPractica = searchParams.get("areaPractica");
  const ciudad = searchParams.get("ciudad");
  const formato = searchParams.get("formato");
  const remuneracion = searchParams.get("remuneracion");
  const estudioId = searchParams.get("estudioId");
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  const where: Record<string, unknown> = { isActive: true, isHidden: false };

  if (type && validTipos.has(type)) where.type = type;
  if (areaPractica) where.areaPractica = areaPractica;
  if (ciudad) where.ciudad = ciudad;
  if (formato) where.formato = formato;
  if (remuneracion) where.remuneracion = remuneracion;
  if (estudioId) where.estudioId = estudioId;

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
      estudio: {
        select: {
          id: true,
          slug: true,
          nombre: true,
          logoUrl: true,
          verificado: true,
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
    type?: string;
    estudioId?: string | null;
    empresa: string;
    areaPractica: string;
    titulo: string;
    descripcion: string;
    ciudad: string;
    formato: string;
    jornada?: string | null;
    duracion?: string;
    remuneracion: string;
    montoRemu?: number | string;
    requisitos?: string;
    fechaInicio?: string | null;
    fechaLimite?: string | null;
    cupos?: number | null;
    anioMinimoCarrera?: number | null;
    promedioMinimo?: number | null;
    areasRequeridas?: string[];
    postulacionTipo?: string | null;
    postulacionUrl?: string | null;
    contactoWhatsapp?: string | null;
    contactoEmail?: string | null;
    // Compat con el CRUD antiguo
    metodoPostulacion?: string;
    contactoPostulacion?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const type = (body.type ?? "ofrezco").toLowerCase();
  if (!validTipos.has(type)) {
    return NextResponse.json({ error: "Tipo de pasantía no válido" }, { status: 400 });
  }

  // Validaciones comunes
  if (!body.titulo?.trim()) {
    return NextResponse.json({ error: "Título es requerido" }, { status: 400 });
  }
  if (!body.descripcion?.trim()) {
    return NextResponse.json({ error: "Descripción es requerida" }, { status: 400 });
  }
  if (!body.areaPractica || !validAreas.includes(body.areaPractica)) {
    return NextResponse.json({ error: "Área de práctica no válida" }, { status: 400 });
  }
  if (!body.formato || !validFormatos.includes(body.formato)) {
    return NextResponse.json({ error: "Formato de trabajo no válido" }, { status: 400 });
  }
  if (!body.remuneracion || !validRemuneracion.includes(body.remuneracion)) {
    return NextResponse.json({ error: "Opción de remuneración no válida" }, { status: 400 });
  }
  if (body.jornada && !validJornadas.includes(body.jornada)) {
    return NextResponse.json({ error: "Jornada no válida" }, { status: 400 });
  }

  // Validaciones específicas por tipo
  if (type === "ofrezco") {
    if (!body.empresa?.trim()) {
      return NextResponse.json({ error: "Empresa es requerida" }, { status: 400 });
    }
    if (body.postulacionTipo && !validPostulacionTipos.has(body.postulacionTipo)) {
      return NextResponse.json({ error: "Tipo de postulación no válido" }, { status: 400 });
    }
    if (body.postulacionTipo === "EXTERNA" && !body.postulacionUrl?.trim()) {
      return NextResponse.json(
        { error: "URL externa requerida para postulación EXTERNA" },
        { status: 400 },
      );
    }
  }

  // Validar estudioId (si se envía, el user debe ser member o admin_plataforma)
  if (body.estudioId) {
    const member = await prisma.estudioMember.findUnique({
      where: {
        estudioId_userId: {
          estudioId: body.estudioId,
          userId: authUser.id,
        },
      },
    });
    if (!member) {
      return NextResponse.json(
        { error: "No eres miembro de ese estudio" },
        { status: 403 },
      );
    }
  }

  const pasantia = await prisma.pasantia.create({
    data: {
      userId: authUser.id,
      type,
      estudioId: body.estudioId || null,
      empresa: body.empresa?.trim() || (type === "busco" ? "—" : ""),
      areaPractica: body.areaPractica,
      titulo: body.titulo.trim(),
      descripcion: body.descripcion.trim(),
      ciudad: body.ciudad?.trim() || "",
      formato: body.formato,
      jornada: body.jornada?.trim() || null,
      duracion: body.duracion?.trim() || null,
      remuneracion: body.remuneracion,
      montoRemu: body.montoRemu != null ? String(body.montoRemu) : null,
      requisitos: body.requisitos?.trim() || null,
      fechaInicio: body.fechaInicio ? new Date(body.fechaInicio) : null,
      fechaLimite: body.fechaLimite ? new Date(body.fechaLimite) : null,
      cupos: body.cupos ?? null,
      anioMinimoCarrera: body.anioMinimoCarrera ?? null,
      promedioMinimo: body.promedioMinimo ?? null,
      areasRequeridas: Array.isArray(body.areasRequeridas) ? body.areasRequeridas : [],
      postulacionTipo: body.postulacionTipo ?? null,
      postulacionUrl: body.postulacionUrl?.trim() || null,
      contactoWhatsapp: body.contactoWhatsapp?.trim() || null,
      contactoEmail: body.contactoEmail?.trim() || null,
      // Campos legacy (compat con CRUD antiguo en /gestion)
      metodoPostulacion: body.metodoPostulacion?.trim() || "en_plataforma",
      contactoPostulacion: body.contactoPostulacion?.trim() || null,
      isActive: true,
      isHidden: false,
    },
  });

  return NextResponse.json(pasantia, { status: 201 });
}
