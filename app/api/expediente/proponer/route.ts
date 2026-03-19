import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CIERRE_DIA, CIERRE_HORA, CIERRE_MINUTO } from "@/lib/expediente-config";

// POST /api/expediente/proponer — User proposes an expediente
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const {
      titulo,
      hechos,
      pregunta,
      rama,
      materias,
      bandoDemandante,
      bandoDemandado,
    } = body;

    if (!titulo || !hechos || !pregunta || !rama) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    // Calculate next Sunday 23:59
    const now = new Date();
    const daysUntilSunday = (CIERRE_DIA - now.getDay() + 7) % 7 || 7;
    const fechaCierre = new Date(now);
    fechaCierre.setDate(now.getDate() + daysUntilSunday);
    fechaCierre.setHours(CIERRE_HORA, CIERRE_MINUTO, 59, 999);

    // Auto-assign numero
    const maxNumero = await prisma.expediente.aggregate({
      _max: { numero: true },
    });
    const numero = (maxNumero._max.numero ?? 0) + 1;

    await prisma.expediente.create({
      data: {
        numero,
        titulo,
        hechos,
        pregunta,
        rama,
        materias: materias || null,
        bandoDemandante: bandoDemandante || "Demandante",
        bandoDemandado: bandoDemandado || "Demandado",
        fechaCierre,
        aprobado: false,
        propuestaPor: authUser.id,
      },
    });

    return NextResponse.json(
      { message: "Propuesta enviada. Será revisada por un administrador." },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/expediente/proponer]", error);
    return NextResponse.json(
      { error: "Error al proponer expediente" },
      { status: 500 }
    );
  }
}
