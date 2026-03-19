import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/expediente — List expedientes
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const estado = searchParams.get("estado") || "todos";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1"));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10")));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = { aprobado: true };
    if (estado === "abierto") where.estado = "abierto";
    else if (estado === "cerrado") where.estado = { in: ["cerrado", "editorial"] };

    const [expedientes, total] = await Promise.all([
      prisma.expediente.findMany({
        where,
        orderBy: { fechaApertura: "desc" },
        skip,
        take: limit,
        include: {
          _count: { select: { argumentos: true } },
          argumentos: {
            where: { parentId: null },
            select: { bando: true },
          },
        },
      }),
      prisma.expediente.count({ where }),
    ]);

    const data = expedientes.map((exp) => {
      const argumentosDemandante = exp.argumentos.filter(
        (a) => a.bando === "demandante"
      ).length;
      const argumentosDemandado = exp.argumentos.filter(
        (a) => a.bando === "demandado"
      ).length;

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { argumentos: _args, ...rest } = exp;
      return {
        ...rest,
        argumentosDemandante,
        argumentosDemandado,
      };
    });

    return NextResponse.json({
      expedientes: data,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    });
  } catch (error) {
    console.error("[GET /api/expediente]", error);
    return NextResponse.json(
      { error: "Error al obtener expedientes" },
      { status: 500 }
    );
  }
}

// POST /api/expediente — Create expediente (admin only)
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const body = await request.json();
    const {
      titulo,
      hechos,
      pregunta,
      rama,
      materias,
      dificultad,
      bandoDemandante,
      bandoDemandado,
      fechaCierre,
    } = body;

    if (!titulo || !hechos || !pregunta || !rama || !fechaCierre) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Auto-assign numero
    const maxNumero = await prisma.expediente.aggregate({
      _max: { numero: true },
    });
    const numero = (maxNumero._max.numero ?? 0) + 1;

    const expediente = await prisma.expediente.create({
      data: {
        numero,
        titulo,
        hechos,
        pregunta,
        rama,
        materias: materias || null,
        dificultad: dificultad ?? 2,
        bandoDemandante: bandoDemandante || "Demandante",
        bandoDemandado: bandoDemandado || "Demandado",
        fechaCierre: new Date(fechaCierre),
        creadoPor: authUser.id,
      },
    });

    return NextResponse.json({ expediente }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/expediente]", error);
    return NextResponse.json(
      { error: "Error al crear expediente" },
      { status: 500 }
    );
  }
}
