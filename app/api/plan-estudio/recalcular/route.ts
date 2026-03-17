/**
 * POST /api/plan-estudio/recalcular — Recalcular plan desde hoy
 *
 * Preserva sesiones pasadas completadas, elimina futuras,
 * y redistribuye los temas pendientes en los días restantes.
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

// ─── Helpers (misma lógica que generar) ──────────────────────────────────────

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
    const vfMin = totalMin - flashMin - mcqMin;

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

export async function POST() {
  try {
    // 1. Auth
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }

    // 2. Obtener plan con temas y sesiones
    const plan = await prisma.planEstudio.findUnique({
      where: { userId: user.id },
      include: {
        temas: { orderBy: [{ prioridad: "asc" }, { estimacionHoras: "desc" }] },
        sesiones: { orderBy: { fecha: "asc" } },
      },
    });

    if (!plan) {
      return NextResponse.json(
        { error: "No existe un plan de estudio." },
        { status: 404 }
      );
    }

    if (plan.estado !== "activo") {
      return NextResponse.json(
        { error: `El plan está en estado "${plan.estado}". Solo se puede recalcular un plan activo.` },
        { status: 400 }
      );
    }

    // 3. Separar sesiones pasadas (preservar) de futuras (eliminar)
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);

    const sesionesPasadas = plan.sesiones.filter(
      (s) => new Date(s.fecha) < hoy
    );
    const sesionesFuturas = plan.sesiones.filter(
      (s) => new Date(s.fecha) >= hoy
    );

    // 4. Eliminar sesiones futuras
    if (sesionesFuturas.length > 0) {
      const idsFuturos = sesionesFuturas.map((s) => s.id);

      await prisma.planSesionDiaria.deleteMany({
        where: { id: { in: idsFuturos } },
      });

      // 5. Eliminar eventos de calendario correspondientes
      const calendarEventIds = sesionesFuturas
        .map((s) => s.calendarEventId)
        .filter((id): id is string => id !== null);

      if (calendarEventIds.length > 0) {
        await prisma.calendarEvent.deleteMany({
          where: { id: { in: calendarEventIds } },
        });
      }
    }

    // 6. Temas no completados
    const temasPendientes = plan.temas.filter(
      (t) => !t.completado && t.porcentaje < 100
    );

    if (temasPendientes.length === 0) {
      // Todos los temas están completos
      await prisma.planEstudio.update({
        where: { id: plan.id },
        data: { estado: "completado" },
      });

      return NextResponse.json({
        sesionesRecalculadas: 0,
        mensaje: "Todos los temas están completados. El plan se marcó como completado.",
      });
    }

    // 7. Ajustar horas según progreso actual
    const temasAjustados = temasPendientes.map((t) => ({
      id: t.id,
      nombre: t.nombre,
      rama: t.rama,
      libro: t.libro,
      titulo: t.titulo,
      estimacionHoras: t.estimacionHoras * (1 - t.porcentaje / 100),
    }));

    // Config
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

    if (fechaExamen <= hoy) {
      return NextResponse.json(
        { error: "La fecha de examen ya pasó. Actualiza la configuración." },
        { status: 400 }
      );
    }

    // Desde mañana
    const manana = new Date(hoy);
    manana.setDate(manana.getDate() + 1);
    manana.setHours(0, 0, 0, 0);

    const diasDisponibles = calcularDiasDisponibles(manana, fechaExamen, diasDescansoNums);

    if (diasDisponibles.length === 0) {
      return NextResponse.json(
        { error: "No hay días disponibles antes del examen con la configuración actual." },
        { status: 400 }
      );
    }

    // 8. Distribuir temas pendientes
    const sesiones = distribuirTemas(temasAjustados, diasDisponibles, minutosEstudioDia);

    // 9. Crear sesiones y eventos
    const sesionesCreadas = [];

    for (const sesion of sesiones) {
      const nombresUnicos = Array.from(
        new Set(sesion.actividades.map((a) => a.temaNombre))
      );
      const topicNames =
        nombresUnicos.length <= 2
          ? nombresUnicos.join(" y ")
          : `${nombresUnicos.slice(0, 2).join(", ")} (+${nombresUnicos.length - 2})`;

      const descripcionLineas = sesion.actividades.map(
        (a) => `• ${a.temaNombre} — ${a.actividad} (${a.duracionMin} min)`
      );
      const descripcion = descripcionLineas.join("\n");

      const startDate = new Date(sesion.fecha);
      startDate.setHours(9, 0, 0, 0);

      const endDate = new Date(startDate);
      endDate.setHours(startDate.getHours() + horasEstudioDia);

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

    // 10. Respuesta
    const sesionesPreservadas = sesionesPasadas.length;
    const horasRecalculadas =
      sesionesCreadas.reduce((sum, s) => sum + s.duracionTotalMin, 0) / 60;

    return NextResponse.json({
      sesionesRecalculadas: sesionesCreadas.length,
      sesionesPreservadas,
      horasRecalculadas: Math.round(horasRecalculadas * 100) / 100,
      temasPendientes: temasPendientes.length,
      mensaje: `Plan recalculado: ${sesionesCreadas.length} nuevas sesiones creadas (${sesionesPreservadas} sesiones pasadas preservadas).`,
    });
  } catch (error) {
    console.error("[plan-estudio/recalcular] Error:", error);
    return NextResponse.json(
      { error: "Error interno al recalcular el plan de estudio" },
      { status: 500 }
    );
  }
}
