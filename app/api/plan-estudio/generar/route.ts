/**
 * POST /api/plan-estudio/generar — Generar plan de estudio día a día
 *
 * Body: { modo?: "automatico" | "manual" }
 *   - "automatico" (default): crea sesiones y eventos en calendario
 *   - "manual": retorna la propuesta sin persistir, para revisión del usuario
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── Mapeo días de la semana (español → JS getDay()) ────────────────────────
const DIA_MAP: Record<string, number> = {
  domingo: 0,
  lunes: 1,
  martes: 2,
  miércoles: 3,
  miercoles: 3,
  jueves: 4,
  viernes: 5,
  sábado: 6,
  sabado: 6,
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Genera la lista de fechas hábiles entre `desde` y `hasta` (inclusive). */
function calcularDiasDisponibles(
  desde: Date,
  hasta: Date,
  diasDescansoNums: Set<number>
): Date[] {
  const dias: Date[] = [];
  const cursor = new Date(desde);
  cursor.setHours(0, 0, 0, 0);

  const limite = new Date(hasta);
  limite.setHours(23, 59, 59, 999);

  while (cursor <= limite) {
    if (!diasDescansoNums.has(cursor.getDay())) {
      dias.push(new Date(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }

  return dias;
}

interface Actividad {
  temaId: string;
  temaNombre: string;
  actividad: "flashcards" | "mcq" | "vf";
  duracionMin: number;
  rama: string;
  libro: string | null;
  titulo: string;
}

interface SesionPropuesta {
  fecha: Date;
  actividades: Actividad[];
  duracionTotalMin: number;
}

/**
 * Distribuye los temas en los días disponibles respetando horasEstudioDia.
 * Cada tema se divide en actividades (flashcards 40%, mcq 35%, vf 25%).
 * Si un tema no cabe en un día, se parte entre varios.
 */
function distribuirTemas(
  temas: {
    id: string;
    nombre: string;
    rama: string;
    libro: string | null;
    titulo: string;
    estimacionHoras: number;
  }[],
  diasDisponibles: Date[],
  minutosEstudioDia: number
): SesionPropuesta[] {
  if (diasDisponibles.length === 0 || temas.length === 0) return [];

  // Generar fragmentos de actividades por tema
  interface Fragmento {
    temaId: string;
    temaNombre: string;
    rama: string;
    libro: string | null;
    titulo: string;
    actividad: "flashcards" | "mcq" | "vf";
    duracionMin: number;
  }

  const fragmentos: Fragmento[] = [];

  for (const tema of temas) {
    const totalMin = Math.round(tema.estimacionHoras * 60);
    if (totalMin <= 0) continue;

    const flashMin = Math.round(totalMin * 0.4);
    const mcqMin = Math.round(totalMin * 0.35);
    const vfMin = totalMin - flashMin - mcqMin; // remainder ≈ 25%

    const base = {
      temaId: tema.id,
      temaNombre: tema.nombre,
      rama: tema.rama,
      libro: tema.libro,
      titulo: tema.titulo,
    };

    if (flashMin > 0) fragmentos.push({ ...base, actividad: "flashcards", duracionMin: flashMin });
    if (mcqMin > 0) fragmentos.push({ ...base, actividad: "mcq", duracionMin: mcqMin });
    if (vfMin > 0) fragmentos.push({ ...base, actividad: "vf", duracionMin: vfMin });
  }

  // Distribuir fragmentos en días
  const sesiones: SesionPropuesta[] = [];
  let diaIdx = 0;
  let minutosRestantesDia = minutosEstudioDia;
  let actividadesDia: Actividad[] = [];

  for (const frag of fragmentos) {
    let pendiente = frag.duracionMin;

    while (pendiente > 0 && diaIdx < diasDisponibles.length) {
      const asignar = Math.min(pendiente, minutosRestantesDia);

      actividadesDia.push({
        temaId: frag.temaId,
        temaNombre: frag.temaNombre,
        actividad: frag.actividad,
        duracionMin: asignar,
        rama: frag.rama,
        libro: frag.libro,
        titulo: frag.titulo,
      });

      pendiente -= asignar;
      minutosRestantesDia -= asignar;

      if (minutosRestantesDia <= 0) {
        // Cerrar día actual
        sesiones.push({
          fecha: diasDisponibles[diaIdx],
          actividades: actividadesDia,
          duracionTotalMin: minutosEstudioDia,
        });
        actividadesDia = [];
        diaIdx++;
        minutosRestantesDia = minutosEstudioDia;
      }
    }

    if (diaIdx >= diasDisponibles.length && pendiente > 0) break;
  }

  // Último día parcial
  if (actividadesDia.length > 0 && diaIdx < diasDisponibles.length) {
    sesiones.push({
      fecha: diasDisponibles[diaIdx],
      actividades: actividadesDia,
      duracionTotalMin: minutosEstudioDia - minutosRestantesDia,
    });
  }

  return sesiones;
}

// ─── POST handler ────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const modoOverride = body?.modo as string | undefined;

    // 2. Obtener plan con temas
    const plan = await prisma.planEstudio.findUnique({
      where: { userId: user.id },
      include: {
        temas: { orderBy: [{ prioridad: "asc" }, { estimacionHoras: "desc" }] },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "No existe un plan de estudio. Crea uno primero." },
        { status: 404 }
      );
    }

    if (!["configurando", "activo"].includes(plan.estado)) {
      return NextResponse.json(
        { error: `El plan está en estado "${plan.estado}" y no se puede generar.` },
        { status: 400 }
      );
    }

    if (plan.temas.length === 0) {
      return NextResponse.json(
        { error: "El plan no tiene temas. Agrega temas antes de generar." },
        { status: 400 }
      );
    }

    // 3. Config
    const fechaExamen = new Date(plan.fechaExamen);
    const horasEstudioDia = plan.horasEstudioDia;
    const minutosEstudioDia = horasEstudioDia * 60;

    let diasDescansoArr: string[] = [];
    try {
      diasDescansoArr = JSON.parse(plan.diasDescanso);
    } catch {
      diasDescansoArr = [];
    }

    const diasDescansoNums = new Set(
      diasDescansoArr
        .map((d) => DIA_MAP[d.toLowerCase().trim()])
        .filter((n): n is number => n !== undefined)
    );

    const modo = modoOverride === "manual" ? "manual" : (modoOverride === "automatico" ? "automatico" : plan.modoGeneracion);

    // 4. Calcular días disponibles (desde mañana hasta fechaExamen)
    const hoy = new Date();
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);

    if (fechaExamen <= hoy) {
      return NextResponse.json(
        { error: "La fecha de examen ya pasó. Actualiza la configuración." },
        { status: 400 }
      );
    }

    const diasDisponibles = calcularDiasDisponibles(manana, fechaExamen, diasDescansoNums);

    if (diasDisponibles.length === 0) {
      return NextResponse.json(
        { error: "No hay días disponibles para estudiar con la configuración actual." },
        { status: 400 }
      );
    }

    // 5-6. Distribuir temas
    const temasOrdenados = plan.temas.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      rama: t.rama,
      libro: t.libro,
      titulo: t.titulo,
      estimacionHoras: t.estimacionHoras,
    }));

    const sesiones = distribuirTemas(temasOrdenados, diasDisponibles, minutosEstudioDia);

    const horasTotales = sesiones.reduce((sum, s) => sum + s.duracionTotalMin, 0) / 60;

    // Modo manual: retornar propuesta sin persistir
    if (modo === "manual") {
      return NextResponse.json({
        propuesta: sesiones.map((s) => ({
          fecha: s.fecha.toISOString(),
          actividades: s.actividades,
          duracionTotalMin: s.duracionTotalMin,
        })),
        diasTotales: diasDisponibles.length,
        diasEstudio: sesiones.length,
        horasTotales: Math.round(horasTotales * 100) / 100,
      });
    }

    // 7. Eliminar sesiones existentes
    await prisma.planSesionDiaria.deleteMany({
      where: { planId: plan.id },
    });

    // 8-10. Crear sesiones y eventos de calendario
    const sesionesCreadas = [];

    for (const sesion of sesiones) {
      // Nombres de temas únicos para el título del evento
      const nombresUnicos = Array.from(
        new Set(sesion.actividades.map((a) => a.temaNombre))
      );
      const topicNames =
        nombresUnicos.length <= 2
          ? nombresUnicos.join(" y ")
          : `${nombresUnicos.slice(0, 2).join(", ")} (+${nombresUnicos.length - 2})`;

      // Descripción del evento
      const descripcionLineas = sesion.actividades.map(
        (a) => `• ${a.temaNombre} — ${a.actividad} (${a.duracionMin} min)`
      );
      const descripcion = descripcionLineas.join("\n");

      // Hora inicio: 9:00 AM Chile (UTC-3 / UTC-4 depending on DST)
      const startDate = new Date(sesion.fecha);
      startDate.setHours(9, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + horasEstudioDia);

      // 9. Crear evento de calendario
      const calendarEvent = await prisma.calendarEvent.create({
        data: {
          userId: user.id,
          title: `📚 Plan: ${topicNames}`,
          description: descripcion,
          eventType: "estudio",
          startDate,
          endDate,
          allDay: false,
          color: "#9a7230",
        },
      });

      // 8 & 10. Crear sesión con referencia al evento
      const sesionDiaria = await prisma.planSesionDiaria.create({
        data: {
          planId: plan.id,
          fecha: sesion.fecha,
          actividades: JSON.stringify(sesion.actividades),
          calendarEventId: calendarEvent.id,
        },
      });

      sesionesCreadas.push({
        id: sesionDiaria.id,
        fecha: sesionDiaria.fecha.toISOString(),
        actividades: sesion.actividades,
        duracionTotalMin: sesion.duracionTotalMin,
        calendarEventId: calendarEvent.id,
      });
    }

    // 11. Activar plan
    await prisma.planEstudio.update({
      where: { id: plan.id },
      data: { estado: "activo" },
    });

    // 12. Respuesta
    return NextResponse.json({
      sesiones: sesionesCreadas,
      diasTotales: diasDisponibles.length,
      diasEstudio: sesionesCreadas.length,
      horasTotales: Math.round(horasTotales * 100) / 100,
    });
  } catch (error) {
    console.error("[plan-estudio/generar] Error:", error);
    return NextResponse.json(
      { error: "Error interno al generar el plan de estudio" },
      { status: 500 }
    );
  }
}
