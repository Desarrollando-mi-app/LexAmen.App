import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
// GET: List approved events (public)
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const materia = searchParams.get("materia");
  const formato = searchParams.get("formato");
  const periodo = searchParams.get("periodo") || "proximos"; // "proximos" | "pasados"
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  // Optionally get current user for "hasInteres"
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  const now = new Date();
  const where: Record<string, unknown> = {
    isActive: true,
    isHidden: false,
    approvalStatus: "aprobado",
  };

  if (periodo === "proximos") {
    where.fecha = { gte: now };
  } else {
    where.fecha = { lt: now };
  }

  if (formato) where.formato = formato;
  // materias is a comma-separated string field, filter with contains
  if (materia) where.materias = { contains: materia };

  const eventos = await prisma.eventoAcademico.findMany({
    where,
    orderBy: { fecha: periodo === "proximos" ? "asc" : "desc" },
    take: limit,
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
        },
      },
      _count: {
        select: { interesados: true },
      },
    },
  });

  // If authenticated, check which events the user marked interest in
  let userInteresIds: Set<string> = new Set();
  if (authUser) {
    const userInteres = await prisma.eventoInteres.findMany({
      where: {
        userId: authUser.id,
        eventoId: { in: eventos.map((e) => e.id) },
      },
      select: { eventoId: true },
    });
    userInteresIds = new Set(userInteres.map((i) => i.eventoId));
  }

  const result = eventos.map((e) => ({
    ...e,
    interesadosCount: e._count.interesados,
    hasInteres: userInteresIds.has(e.id),
    createdAt: e.createdAt.toISOString(),
    updatedAt: e.updatedAt.toISOString(),
    fecha: e.fecha.toISOString(),
    fechaFin: e.fechaFin?.toISOString() ?? null,
    approvedAt: e.approvedAt?.toISOString() ?? null,
  }));

  return NextResponse.json(result);
}

// POST: Propose new event (requires auth, pending approval)
export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  let body: {
    titulo: string;
    descripcion: string;
    organizador: string;
    fecha: string;
    fechaFin?: string;
    hora?: string;
    formato: string;
    lugar?: string;
    linkOnline?: string;
    costo: string;
    montoCosto?: string;
    linkInscripcion?: string;
    materias?: string;
  };

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const {
    titulo, descripcion, organizador, fecha, fechaFin, hora,
    formato, lugar, linkOnline, costo, montoCosto,
    linkInscripcion, materias,
  } = body;

  // Validations
  if (!titulo?.trim()) {
    return NextResponse.json({ error: "Título es requerido" }, { status: 400 });
  }
  if (!descripcion?.trim()) {
    return NextResponse.json({ error: "Descripción es requerida" }, { status: 400 });
  }
  if (!organizador?.trim()) {
    return NextResponse.json({ error: "Organizador es requerido" }, { status: 400 });
  }
  if (!fecha) {
    return NextResponse.json({ error: "Fecha es requerida" }, { status: 400 });
  }
  const validFormatos = ["presencial", "online", "hibrido"];
  if (!formato || !validFormatos.includes(formato)) {
    return NextResponse.json({ error: "Formato no válido" }, { status: 400 });
  }
  const validCostos = ["gratis", "pagado"];
  if (!costo || !validCostos.includes(costo)) {
    return NextResponse.json({ error: "Costo no válido" }, { status: 400 });
  }

  const parsedFecha = new Date(fecha);
  if (isNaN(parsedFecha.getTime())) {
    return NextResponse.json({ error: "Fecha inválida" }, { status: 400 });
  }

  const parsedFechaFin = fechaFin ? new Date(fechaFin) : null;

  const evento = await prisma.eventoAcademico.create({
    data: {
      userId: authUser.id,
      titulo: titulo.trim(),
      descripcion: descripcion.trim(),
      organizador: organizador.trim(),
      fecha: parsedFecha,
      fechaFin: parsedFechaFin,
      hora: hora?.trim() || null,
      formato,
      lugar: lugar?.trim() || null,
      linkOnline: linkOnline?.trim() || null,
      costo,
      montoCosto: montoCosto?.trim() || null,
      linkInscripcion: linkInscripcion?.trim() || null,
      materias: materias?.trim() || null,
      approvalStatus: "aprobado",
      approvedAt: new Date(),
      isActive: true,
      isHidden: false,
    },
  });

  return NextResponse.json({
    evento,
    message: "Tu evento ha sido publicado exitosamente.",
  }, { status: 201 });
}
