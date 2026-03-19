import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Advance debate states (admin/cron) ────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  try {
    const debate = await prisma.debateJuridico.findUnique({
      where: { id },
      include: {
        autor1: { select: { firstName: true, lastName: true } },
        autor2: { select: { firstName: true, lastName: true } },
      },
    });

    if (!debate) {
      return NextResponse.json(
        { error: "Debate no encontrado" },
        { status: 404 }
      );
    }

    const now = new Date();

    // ── argumentos -> replicas (deadline passed) ──
    if (
      debate.estado === "argumentos" &&
      debate.fechaLimiteArgumentos &&
      now > debate.fechaLimiteArgumentos
    ) {
      const fechaLimiteReplicas = new Date();
      fechaLimiteReplicas.setDate(fechaLimiteReplicas.getDate() + 3);

      await prisma.debateJuridico.update({
        where: { id },
        data: {
          estado: "replicas",
          fechaLimiteReplicas,
        },
      });

      return NextResponse.json({ advanced: true, nuevoEstado: "replicas" });
    }

    // ── replicas -> votacion (deadline passed) ──
    if (
      debate.estado === "replicas" &&
      debate.fechaLimiteReplicas &&
      now > debate.fechaLimiteReplicas
    ) {
      const fechaLimiteVotacion = new Date();
      fechaLimiteVotacion.setDate(fechaLimiteVotacion.getDate() + 5);

      await prisma.debateJuridico.update({
        where: { id },
        data: {
          estado: "votacion",
          fechaLimiteVotacion,
        },
      });

      return NextResponse.json({ advanced: true, nuevoEstado: "votacion" });
    }

    // ── votacion -> cerrado (deadline passed) ──
    if (
      debate.estado === "votacion" &&
      debate.fechaLimiteVotacion &&
      now > debate.fechaLimiteVotacion
    ) {
      // Determine winner
      const winnerId =
        debate.votosAutor1 >= debate.votosAutor2
          ? debate.autor1Id
          : debate.autor2Id;
      const loserId =
        debate.votosAutor1 >= debate.votosAutor2
          ? debate.autor2Id
          : debate.autor1Id;

      await prisma.debateJuridico.update({
        where: { id },
        data: { estado: "cerrado" },
      });

      // Award XP: +20 winner, +5 loser
      if (winnerId) {
        await awardXp({
          userId: winnerId,
          amount: 20,
          category: "publicaciones",
          prisma,
          detalle: "Debates",
        });
      }

      if (loserId) {
        await awardXp({
          userId: loserId,
          amount: 5,
          category: "publicaciones",
          prisma,
          detalle: "Debates",
        });
      }

      // Notify both participants
      const winnerName =
        winnerId === debate.autor1Id
          ? `${debate.autor1?.firstName} ${debate.autor1?.lastName}`
          : `${debate.autor2?.firstName} ${debate.autor2?.lastName}`;

      if (debate.autor1Id) {
        await sendNotification({
          type: "SYSTEM_BROADCAST",
          title: "Debate finalizado",
          body: `El debate "${debate.titulo}" ha terminado. Ganador: ${winnerName} (${debate.votosAutor1} vs ${debate.votosAutor2} votos).`,
          targetUserId: debate.autor1Id,
        });
      }

      if (debate.autor2Id) {
        await sendNotification({
          type: "SYSTEM_BROADCAST",
          title: "Debate finalizado",
          body: `El debate "${debate.titulo}" ha terminado. Ganador: ${winnerName} (${debate.votosAutor1} vs ${debate.votosAutor2} votos).`,
          targetUserId: debate.autor2Id,
        });
      }

      return NextResponse.json({ advanced: true, nuevoEstado: "cerrado" });
    }

    return NextResponse.json({ advanced: false, estado: debate.estado });
  } catch (error) {
    console.error("Error advancing debate:", error);
    return NextResponse.json(
      { error: "Error al avanzar el debate" },
      { status: 500 }
    );
  }
}
