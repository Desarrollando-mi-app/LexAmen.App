import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { sendNotification } from "@/lib/notifications";

// ─── POST: Accept a debate challenge ─────────────────────────

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
    const { miPosicion } = body;

    if (!miPosicion || miPosicion.length < 10 || miPosicion.length > 500) {
      return NextResponse.json(
        { error: "La posicion debe tener entre 10 y 500 caracteres" },
        { status: 400 }
      );
    }

    const debate = await prisma.debateJuridico.findUnique({
      where: { id },
    });

    if (!debate) {
      return NextResponse.json(
        { error: "Debate no encontrado" },
        { status: 404 }
      );
    }

    if (debate.estado !== "buscando_oponente") {
      return NextResponse.json(
        { error: "Este debate ya tiene oponente" },
        { status: 400 }
      );
    }

    if (debate.autor1Id === userId) {
      return NextResponse.json(
        { error: "No puedes debatir contra ti mismo" },
        { status: 400 }
      );
    }

    const fechaLimiteArgumentos = new Date();
    fechaLimiteArgumentos.setDate(fechaLimiteArgumentos.getDate() + 3);

    const updated = await prisma.debateJuridico.update({
      where: { id },
      data: {
        autor2Id: userId,
        autor2Posicion: miPosicion,
        estado: "argumentos",
        fechaLimiteArgumentos,
      },
      include: {
        autor1: {
          select: { firstName: true, lastName: true },
        },
        autor2: {
          select: { firstName: true, lastName: true },
        },
      },
    });

    // Award XP to opponent
    await awardXp({
      userId,
      amount: 3,
      category: "publicaciones",
      prisma,
      detalle: "Debates",
    });

    // Notify autor1
    await sendNotification({
      type: "SYSTEM_BROADCAST",
      title: "Tu debate tiene oponente",
      body: `${updated.autor2?.firstName} ${updated.autor2?.lastName} ha aceptado debatir "${updated.titulo}". Tienes 3 dias para publicar tu argumento.`,
      targetUserId: debate.autor1Id,
    });

    return NextResponse.json({ debate: updated });
  } catch (error) {
    console.error("Error accepting debate:", error);
    return NextResponse.json(
      { error: "Error al aceptar el debate" },
      { status: 500 }
    );
  }
}
