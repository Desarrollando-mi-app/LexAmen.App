import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Listar ofertas de trabajo ──────────────────────

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const areaPractica = searchParams.get("areaPractica");
  const ciudad = searchParams.get("ciudad");
  const formato = searchParams.get("formato");
  const tipoContrato = searchParams.get("tipoContrato");
  const experienciaReq = searchParams.get("experienciaReq");
  const limit = Math.min(Number(searchParams.get("limit")) || 30, 100);

  const where: Record<string, unknown> = { isActive: true, isHidden: false };

  if (areaPractica) where.areaPractica = areaPractica;
  if (ciudad) where.ciudad = ciudad;
  if (formato) where.formato = formato;
  if (tipoContrato) where.tipoContrato = tipoContrato;
  if (experienciaReq) where.experienciaReq = experienciaReq;

  const ofertas = await prisma.ofertaTrabajo.findMany({
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

  return NextResponse.json(ofertas);
}

// ─── POST: Crear oferta de trabajo ───────────────────────

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
    cargo: string;
    areaPractica: string;
    descripcion: string;
    ciudad: string;
    formato: string;
    tipoContrato: string;
    experienciaReq?: string;
    remuneracion?: string;
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
    cargo,
    areaPractica,
    descripcion,
    ciudad,
    formato,
    tipoContrato,
    experienciaReq,
    remuneracion,
    requisitos,
    metodoPostulacion,
    contactoPostulacion,
  } = body;

  // Validaciones
  if (
    !empresa?.trim() ||
    !cargo?.trim() ||
    !descripcion?.trim()
  ) {
    return NextResponse.json(
      { error: "Empresa, cargo y descripción son requeridos" },
      { status: 400 }
    );
  }

  if (!formato?.trim() || !tipoContrato?.trim() || !metodoPostulacion?.trim()) {
    return NextResponse.json(
      { error: "Formato, tipo de contrato y método de postulación son requeridos" },
      { status: 400 }
    );
  }

  const oferta = await prisma.ofertaTrabajo.create({
    data: {
      userId: authUser.id,
      empresa: empresa.trim(),
      cargo: cargo.trim(),
      areaPractica: areaPractica?.trim() || "",
      descripcion: descripcion.trim(),
      ciudad: ciudad?.trim() || "",
      formato: formato.trim(),
      tipoContrato: tipoContrato.trim(),
      experienciaReq: experienciaReq?.trim() || null,
      remuneracion: remuneracion?.trim() || null,
      requisitos: requisitos?.trim() || null,
      metodoPostulacion: metodoPostulacion.trim(),
      contactoPostulacion: contactoPostulacion?.trim() || null,
      isActive: true,
      isHidden: false,
    },
  });

  return NextResponse.json(oferta, { status: 201 });
}
