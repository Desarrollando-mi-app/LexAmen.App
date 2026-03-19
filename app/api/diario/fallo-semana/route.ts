import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Fallo de la Semana activo + recientes cerrados ─────────

export async function GET() {
  // 1. Fallo activo
  const falloActivo = await prisma.falloDeLaSemana.findFirst({
    where: { estado: "activo" },
    orderBy: { createdAt: "desc" },
  });

  let activoData = null;
  if (falloActivo) {
    // Count of linked active análisis
    const analisisCount = await prisma.analisisSentencia.count({
      where: {
        falloDeLaSemanaId: falloActivo.id,
        isActive: true,
      },
    });

    // Top 5 análisis by apoyosCount
    const topAnalisis = await prisma.analisisSentencia.findMany({
      where: {
        falloDeLaSemanaId: falloActivo.id,
        isActive: true,
      },
      orderBy: { apoyosCount: "desc" },
      take: 5,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
            grado: true,
          },
        },
      },
    });

    activoData = {
      ...falloActivo,
      analisisCount,
      topAnalisis: topAnalisis.map((a) => ({
        id: a.id,
        titulo: a.titulo,
        resumen: a.resumen,
        apoyosCount: a.apoyosCount,
        createdAt: a.createdAt.toISOString(),
        user: a.user,
      })),
    };
  }

  // 2. Recent cerrados (last 5)
  const cerrados = await prisma.falloDeLaSemana.findMany({
    where: { estado: "cerrado" },
    orderBy: { fechaCierre: "desc" },
    take: 5,
  });

  // Fetch mejorAnalisis data for cerrados that have one
  const cerradosConMejor = await Promise.all(
    cerrados.map(async (f) => {
      let mejorAnalisis = null;
      if (f.mejorAnalisisId) {
        const a = await prisma.analisisSentencia.findUnique({
          where: { id: f.mejorAnalisisId },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                grado: true,
              },
            },
          },
        });
        if (a) {
          mejorAnalisis = {
            id: a.id,
            titulo: a.titulo,
            apoyosCount: a.apoyosCount,
            user: a.user,
          };
        }
      }
      return { ...f, mejorAnalisis };
    }),
  );

  return NextResponse.json({
    activo: activoData,
    cerrados: cerradosConMejor,
  });
}

// ─── POST: Crear Fallo de la Semana (admin only) ─────────────────

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Admin check
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const body = await request.json();
  const {
    titulo,
    tribunal,
    rol,
    fechaFallo,
    resumen,
    preguntaGuia,
    urlFallo,
    rama,
    materias,
    fechaInicio,
    fechaCierre,
  } = body as {
    titulo: string;
    tribunal: string;
    rol: string;
    fechaFallo: string;
    resumen: string;
    preguntaGuia: string;
    urlFallo?: string;
    rama: string;
    materias?: string;
    fechaInicio: string;
    fechaCierre: string;
  };

  // Validations
  if (!titulo?.trim()) {
    return NextResponse.json({ error: "El titulo es requerido" }, { status: 400 });
  }
  if (!tribunal?.trim()) {
    return NextResponse.json({ error: "El tribunal es requerido" }, { status: 400 });
  }
  if (!rol?.trim()) {
    return NextResponse.json({ error: "El rol es requerido" }, { status: 400 });
  }
  if (!resumen?.trim()) {
    return NextResponse.json({ error: "El resumen es requerido" }, { status: 400 });
  }
  if (!preguntaGuia?.trim()) {
    return NextResponse.json({ error: "La pregunta guia es requerida" }, { status: 400 });
  }
  if (!rama?.trim()) {
    return NextResponse.json({ error: "La rama es requerida" }, { status: 400 });
  }
  if (!fechaInicio || !fechaCierre) {
    return NextResponse.json({ error: "Las fechas son requeridas" }, { status: 400 });
  }

  // Auto-assign numero (max + 1)
  const maxNumero = await prisma.falloDeLaSemana.aggregate({
    _max: { numero: true },
  });
  const numero = (maxNumero._max.numero ?? 0) + 1;

  const fallo = await prisma.falloDeLaSemana.create({
    data: {
      numero,
      titulo: titulo.trim(),
      tribunal: tribunal.trim(),
      rol: rol.trim(),
      fechaFallo: fechaFallo?.trim() || "",
      resumen: resumen.trim(),
      preguntaGuia: preguntaGuia.trim(),
      urlFallo: urlFallo?.trim() || null,
      rama: rama.trim(),
      materias: materias?.trim() || null,
      fechaInicio: new Date(fechaInicio),
      fechaCierre: new Date(fechaCierre),
      estado: "activo",
    },
  });

  return NextResponse.json({ fallo }, { status: 201 });
}
