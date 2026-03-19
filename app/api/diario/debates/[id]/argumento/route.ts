import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Submit argumento or replica ───────────────────────

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }

  const userId = authUser.id;

  try {
    const body = await request.json();
    const { texto, tipo } = body as {
      texto: string;
      tipo: "argumento" | "replica";
    };

    if (!texto || !tipo) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (texto.length < 200) {
      return NextResponse.json(
        { error: "El texto debe tener al menos 200 caracteres" },
        { status: 400 }
      );
    }

    if (texto.length > 5000) {
      return NextResponse.json(
        { error: "El texto no puede exceder los 5000 caracteres" },
        { status: 400 }
      );
    }

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

    // Must be a participant
    const isAutor1 = debate.autor1Id === userId;
    const isAutor2 = debate.autor2Id === userId;

    if (!isAutor1 && !isAutor2) {
      return NextResponse.json(
        { error: "No eres participante de este debate" },
        { status: 403 }
      );
    }

    // Validate tipo matches estado
    if (tipo === "argumento" && debate.estado !== "argumentos") {
      return NextResponse.json(
        { error: "No es momento de publicar argumentos" },
        { status: 400 }
      );
    }

    if (tipo === "replica" && debate.estado !== "replicas") {
      return NextResponse.json(
        { error: "No es momento de publicar replicas" },
        { status: 400 }
      );
    }

    // Check if this user already submitted for this phase
    if (tipo === "argumento") {
      if (isAutor1 && debate.autor1Argumento) {
        return NextResponse.json(
          { error: "Ya publicaste tu argumento" },
          { status: 400 }
        );
      }
      if (isAutor2 && debate.autor2Argumento) {
        return NextResponse.json(
          { error: "Ya publicaste tu argumento" },
          { status: 400 }
        );
      }
    }

    if (tipo === "replica") {
      if (isAutor1 && debate.autor1Replica) {
        return NextResponse.json(
          { error: "Ya publicaste tu replica" },
          { status: 400 }
        );
      }
      if (isAutor2 && debate.autor2Replica) {
        return NextResponse.json(
          { error: "Ya publicaste tu replica" },
          { status: 400 }
        );
      }
    }

    // Build update data
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updateData: any = {};

    if (tipo === "argumento") {
      if (isAutor1) updateData.autor1Argumento = texto;
      else updateData.autor2Argumento = texto;
    } else {
      if (isAutor1) updateData.autor1Replica = texto;
      else updateData.autor2Replica = texto;
    }

    // Check if both participants have submitted, advance state
    const otherArgumento = isAutor1
      ? debate.autor2Argumento
      : debate.autor1Argumento;
    const otherReplica = isAutor1
      ? debate.autor2Replica
      : debate.autor1Replica;

    if (tipo === "argumento" && otherArgumento) {
      // Both have submitted arguments -> advance to replicas
      const fechaLimiteReplicas = new Date();
      fechaLimiteReplicas.setDate(fechaLimiteReplicas.getDate() + 3);
      updateData.estado = "replicas";
      updateData.fechaLimiteReplicas = fechaLimiteReplicas;
    }

    if (tipo === "replica" && otherReplica) {
      // Both have submitted replicas -> advance to votacion
      const fechaLimiteVotacion = new Date();
      fechaLimiteVotacion.setDate(fechaLimiteVotacion.getDate() + 5);
      updateData.estado = "votacion";
      updateData.fechaLimiteVotacion = fechaLimiteVotacion;
    }

    const updated = await prisma.debateJuridico.update({
      where: { id },
      data: updateData,
    });

    // Award XP
    const xpAmount = tipo === "argumento" ? 15 : 10;
    await awardXp({
      userId,
      amount: xpAmount,
      category: "publicaciones",
      prisma,
      detalle: "Debates",
    });

    await evaluateBadges(userId, "diario");

    // Notify the other participant
    const otherUserId = isAutor1 ? debate.autor2Id : debate.autor1Id;
    const authorName = isAutor1
      ? `${debate.autor1?.firstName} ${debate.autor1?.lastName}`
      : `${debate.autor2?.firstName} ${debate.autor2?.lastName}`;

    if (otherUserId) {
      await sendNotification({
        type: "SYSTEM_BROADCAST",
        title:
          tipo === "argumento"
            ? "Nuevo argumento en el debate"
            : "Nueva replica en el debate",
        body: `${authorName} ha publicado su ${tipo} en "${debate.titulo}".`,
        targetUserId: otherUserId,
      });
    }

    return NextResponse.json({ debate: updated });
  } catch (error) {
    console.error("Error submitting argumento:", error);
    return NextResponse.json(
      { error: "Error al publicar" },
      { status: 500 }
    );
  }
}
