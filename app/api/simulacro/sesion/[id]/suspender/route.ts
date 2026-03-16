import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import {
  XP_SIMULACRO_SUSPENDIDO_BASE,
  XP_SIMULACRO_SUSPENDIDO_CORRECTA,
  XP_SIMULACRO_SUSPENDIDO_AVANZADO,
  awardXp,
} from "@/lib/xp-config";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const sesion = await prisma.simulacroSesion.findUnique({
    where: { id },
    include: {
      preguntas: {
        where: { respuestaUser: { not: null } },
        orderBy: { numero: "asc" },
      },
    },
  });

  if (!sesion) {
    return NextResponse.json(
      { error: "Sesión no encontrada" },
      { status: 404 }
    );
  }

  if (sesion.userId !== authUser.id) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  if (sesion.completada) {
    return NextResponse.json(
      { error: "La sesión ya está completada" },
      { status: 400 }
    );
  }

  // Marcar como completada con las preguntas respondidas
  const preguntasRespondidas = sesion.preguntas.length;
  const correctas = sesion.preguntas.filter((p) => p.correcta === true).length;
  const incorrectas = sesion.preguntas.filter((p) => p.correcta === false).length;

  await prisma.simulacroSesion.update({
    where: { id },
    data: {
      completada: true,
      totalPreguntas: preguntasRespondidas || 1, // Al menos 1 para evitar div/0
      correctas,
      incorrectas,
    },
  });

  // XP parcial — via centralized awardXp (user.xp + leagueMember.weeklyXp + XpLog)
  let xpGanado = XP_SIMULACRO_SUSPENDIDO_BASE + correctas * XP_SIMULACRO_SUSPENDIDO_CORRECTA;
  if (sesion.nivelActual === "AVANZADO") xpGanado += XP_SIMULACRO_SUSPENDIDO_AVANZADO;

  await awardXp({
    userId: authUser.id,
    amount: xpGanado,
    category: "simulacro",
    prisma,
  });

  return NextResponse.json({
    ok: true,
    correctas,
    incorrectas,
    totalPreguntas: preguntasRespondidas,
    nivelFinal: sesion.nivelActual,
  });
}
