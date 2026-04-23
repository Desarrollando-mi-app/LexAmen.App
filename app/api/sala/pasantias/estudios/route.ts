import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { slugifyEstudio, ESTUDIO_TAMANOS } from "@/lib/pasantias-helpers";
import { AREAS_PRACTICA } from "@/lib/sala-constants";

const validAreas: string[] = AREAS_PRACTICA.map((a) => a.value);
const validTamanos: string[] = ESTUDIO_TAMANOS.map((t) => t.value);

/**
 * GET  /api/sala/pasantias/estudios
 *   Lista estudios verificados públicos. Filtros: region, area, query.
 *
 * POST /api/sala/pasantias/estudios
 *   Crea un estudio (queda `verificado = false` en espera de aprobación admin).
 *   El creador queda automáticamente como `socio`.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const region = searchParams.get("region");
  const area = searchParams.get("area");
  const query = searchParams.get("q")?.trim().toLowerCase();
  const onlyMine = searchParams.get("mine") === "true";
  const limit = Math.min(Number(searchParams.get("limit") || 30), 100);

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const where: Record<string, unknown> = {};
  if (onlyMine) {
    if (!authUser) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    where.members = { some: { userId: authUser.id } };
  } else {
    where.verificado = true;
  }
  if (region) where.region = region;
  if (area) where.areas = { has: area };

  const estudios = await prisma.estudioJuridico.findMany({
    where,
    orderBy: { nombre: "asc" },
    take: limit,
    select: {
      id: true,
      slug: true,
      nombre: true,
      logoUrl: true,
      tamano: true,
      areas: true,
      region: true,
      ciudad: true,
      verificado: true,
      _count: {
        select: { pasantias: { where: { isActive: true, isHidden: false } } },
      },
    },
  });

  const filtered = query
    ? estudios.filter((e) => e.nombre.toLowerCase().includes(query))
    : estudios;

  return NextResponse.json(filtered);
}

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    nombre: string;
    logoUrl?: string;
    sitioWeb?: string;
    tamano?: string;
    fundacion?: number;
    descripcion?: string;
    areas?: string[];
    region?: string;
    ciudad?: string;
    direccion?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const nombre = body.nombre?.trim();
  if (!nombre) {
    return NextResponse.json({ error: "Nombre es requerido" }, { status: 400 });
  }

  if (body.tamano && !validTamanos.includes(body.tamano)) {
    return NextResponse.json({ error: "Tamaño no válido" }, { status: 400 });
  }

  if (Array.isArray(body.areas)) {
    for (const a of body.areas) {
      if (!validAreas.includes(a)) {
        return NextResponse.json(
          { error: `Área no válida: ${a}` },
          { status: 400 },
        );
      }
    }
  }

  // Slug único — si existe, sufijamos con un contador
  let slug = slugifyEstudio(nombre);
  if (!slug) slug = "estudio";
  let suffix = 0;
  while (
    await prisma.estudioJuridico.findUnique({
      where: { slug: suffix === 0 ? slug : `${slug}-${suffix}` },
      select: { id: true },
    })
  ) {
    suffix += 1;
    if (suffix > 100) break;
  }
  const finalSlug = suffix === 0 ? slug : `${slug}-${suffix}`;

  const estudio = await prisma.estudioJuridico.create({
    data: {
      slug: finalSlug,
      nombre,
      logoUrl: body.logoUrl?.trim() || null,
      sitioWeb: body.sitioWeb?.trim() || null,
      tamano: body.tamano ?? null,
      fundacion: body.fundacion ?? null,
      descripcion: body.descripcion?.trim() || null,
      areas: Array.isArray(body.areas) ? body.areas : [],
      region: body.region?.trim() || null,
      ciudad: body.ciudad?.trim() || null,
      direccion: body.direccion?.trim() || null,
      verificado: false,
      createdById: authUser.id,
      members: {
        create: {
          userId: authUser.id,
          rol: "socio",
        },
      },
    },
  });

  return NextResponse.json(estudio, { status: 201 });
}
