import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { ESTUDIO_TAMANOS } from "@/lib/pasantias-helpers";
import { AREAS_PRACTICA } from "@/lib/sala-constants";

const validAreas: string[] = AREAS_PRACTICA.map((a) => a.value);
const validTamanos: string[] = ESTUDIO_TAMANOS.map((t) => t.value);

/**
 * GET — pública si el estudio está verificado; miembros ven aunque no lo esté.
 * PATCH — sólo miembros con rol socio/asociado pueden editar. Flags de
 *         verificación (`verificado`, `rejectionNote`, etc.) sólo por admins.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const estudio = await prisma.estudioJuridico.findUnique({
    where: { slug },
    include: {
      members: {
        include: {
          user: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              avatarUrl: true,
              etapaActual: true,
              cargoActual: true,
              universidad: true,
            },
          },
        },
      },
      _count: {
        select: { pasantias: { where: { isActive: true, isHidden: false } } },
      },
    },
  });

  if (!estudio) {
    return NextResponse.json({ error: "Estudio no encontrado" }, { status: 404 });
  }

  // Esconde no-verificados de extraños
  if (!estudio.verificado) {
    if (!authUser) {
      return NextResponse.json({ error: "Estudio no encontrado" }, { status: 404 });
    }
    const isMember = estudio.members.some((m) => m.userId === authUser.id);
    if (!isMember) {
      return NextResponse.json({ error: "Estudio no encontrado" }, { status: 404 });
    }
  }

  return NextResponse.json(estudio);
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const estudio = await prisma.estudioJuridico.findUnique({
    where: { slug },
    include: {
      members: { where: { userId: authUser.id }, select: { rol: true } },
    },
  });

  if (!estudio) {
    return NextResponse.json({ error: "Estudio no encontrado" }, { status: 404 });
  }

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  const membership = estudio.members[0];
  const isEditor = membership?.rol === "socio" || membership?.rol === "asociado";
  if (!isEditor && !user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const editableFields = [
    "nombre",
    "logoUrl",
    "coverUrl",
    "sitioWeb",
    "tamano",
    "fundacion",
    "descripcion",
    "areas",
    "region",
    "ciudad",
    "direccion",
  ];

  const adminOnlyFields = ["verificado", "verifiedAt", "verifiedBy", "rejectionNote"];

  const updateData: Record<string, unknown> = {};
  for (const field of editableFields) {
    if (body[field] !== undefined) {
      updateData[field] = body[field];
    }
  }
  if (user?.isAdmin) {
    for (const field of adminOnlyFields) {
      if (body[field] !== undefined) {
        updateData[field] = body[field];
      }
    }
    // Si verificado pasa a true, marcamos verifiedAt y verifiedBy
    if (updateData.verificado === true) {
      updateData.verifiedAt = new Date();
      updateData.verifiedBy = authUser.id;
    }
  }

  // Validaciones blandas
  if (updateData.tamano && !validTamanos.includes(String(updateData.tamano))) {
    return NextResponse.json({ error: "Tamaño no válido" }, { status: 400 });
  }
  if (Array.isArray(updateData.areas)) {
    for (const a of updateData.areas as string[]) {
      if (!validAreas.includes(a)) {
        return NextResponse.json(
          { error: `Área no válida: ${a}` },
          { status: 400 },
        );
      }
    }
  }

  const updated = await prisma.estudioJuridico.update({
    where: { slug },
    data: updateData,
  });

  return NextResponse.json(updated);
}
