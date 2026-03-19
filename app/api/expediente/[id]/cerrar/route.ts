import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { sendNotification } from "@/lib/notifications";
import {
  XP_MEJOR_ALEGATO_1,
  XP_MEJOR_ALEGATO_2,
  XP_MEJOR_ALEGATO_3,
} from "@/lib/expediente-config";

// POST /api/expediente/[id]/cerrar — Admin or CRON
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expedienteId } = await params;

    // Auth: admin or CRON_SECRET
    let isAuthorized = false;

    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
      isAuthorized = true;
    }

    if (!isAuthorized) {
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
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: { id: true, estado: true, titulo: true },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    if (expediente.estado !== "abierto") {
      return NextResponse.json(
        { error: "El expediente ya está cerrado" },
        { status: 400 }
      );
    }

    // Get top 3 argumentos by votos (main arguments only)
    const topArgumentos = await prisma.expedienteArgumento.findMany({
      where: { expedienteId, parentId: null },
      orderBy: { votos: "desc" },
      take: 3,
      select: { id: true, userId: true, votos: true },
    });

    const mejorArgumentoId = topArgumentos[0]?.id ?? null;

    // Close expediente
    await prisma.expediente.update({
      where: { id: expedienteId },
      data: {
        estado: "cerrado",
        mejorArgumentoId,
      },
    });

    // Award XP to top 3
    const xpAmounts = [XP_MEJOR_ALEGATO_1, XP_MEJOR_ALEGATO_2, XP_MEJOR_ALEGATO_3];
    for (let i = 0; i < topArgumentos.length; i++) {
      await awardXp({
        userId: topArgumentos[i].userId,
        amount: xpAmounts[i],
        category: "publicaciones",
        prisma,
        detalle: `Top ${i + 1} argumento en Expediente Abierto`,
      });
    }

    // Notify all participants
    const participants = await prisma.expedienteArgumento.findMany({
      where: { expedienteId },
      select: { userId: true },
      distinct: ["userId"],
    });

    for (const p of participants) {
      await sendNotification({
        type: "NEW_CONTENT",
        title: "Expediente cerrado",
        body: `El expediente "${expediente.titulo}" ha sido cerrado. Revisa los resultados.`,
        targetUserId: p.userId,
      });
    }

    return NextResponse.json({
      success: true,
      mejorArgumentoId,
      topArgumentos: topArgumentos.map((a, i) => ({
        argumentoId: a.id,
        userId: a.userId,
        votos: a.votos,
        xpOtorgado: xpAmounts[i],
      })),
    });
  } catch (error) {
    console.error("[POST /api/expediente/[id]/cerrar]", error);
    return NextResponse.json(
      { error: "Error al cerrar expediente" },
      { status: 500 }
    );
  }
}
