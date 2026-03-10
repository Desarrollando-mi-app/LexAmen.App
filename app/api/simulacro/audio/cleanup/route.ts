import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { limpiarAudiosSesion } from "@/lib/tts";

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // Solo admin
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });

  if (!user?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  // Buscar sesiones completadas hace más de 24h
  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sesiones = await prisma.simulacroSesion.findMany({
    where: {
      completada: true,
      updatedAt: { lt: hace24h },
    },
    select: { id: true },
  });

  let limpiadas = 0;
  for (const sesion of sesiones) {
    try {
      await limpiarAudiosSesion(sesion.id);
      limpiadas++;
    } catch (err) {
      console.error(`Error limpiando audio sesión ${sesion.id}:`, err);
    }
  }

  return NextResponse.json({
    message: `Limpieza completada: ${limpiadas}/${sesiones.length} sesiones`,
    limpiadas,
    total: sesiones.length,
  });
}
