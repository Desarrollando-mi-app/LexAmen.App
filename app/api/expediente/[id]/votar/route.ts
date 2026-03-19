import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { VOTING_MIN_GRADO, XP_VOTO_RECIBIDO } from "@/lib/expediente-config";

// POST /api/expediente/[id]/votar
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expedienteId } = await params;

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: { estado: true },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    if (expediente.estado !== "abierto") {
      return NextResponse.json(
        { error: "El expediente no está abierto para votación" },
        { status: 400 }
      );
    }

    // Check user grado
    const dbUser = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { grado: true },
    });

    if (!dbUser || dbUser.grado < VOTING_MIN_GRADO) {
      return NextResponse.json(
        { error: `Se requiere grado ${VOTING_MIN_GRADO} o superior para votar` },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { argumentoId } = body;

    if (!argumentoId) {
      return NextResponse.json(
        { error: "argumentoId es obligatorio" },
        { status: 400 }
      );
    }

    // Verify argumento belongs to this expediente
    const argumento = await prisma.expedienteArgumento.findUnique({
      where: { id: argumentoId },
      select: { expedienteId: true, userId: true },
    });

    if (!argumento || argumento.expedienteId !== expedienteId) {
      return NextResponse.json(
        { error: "Argumento no encontrado en este expediente" },
        { status: 404 }
      );
    }

    // Can't vote own argument
    if (argumento.userId === authUser.id) {
      return NextResponse.json(
        { error: "No puedes votar tu propio argumento" },
        { status: 400 }
      );
    }

    // Check not already voted (unique constraint will also catch this)
    const existingVote = await prisma.expedienteVoto.findUnique({
      where: {
        argumentoId_userId: {
          argumentoId,
          userId: authUser.id,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "Ya votaste este argumento" },
        { status: 400 }
      );
    }

    // Create vote and increment counter
    await prisma.$transaction([
      prisma.expedienteVoto.create({
        data: {
          argumentoId,
          userId: authUser.id,
        },
      }),
      prisma.expedienteArgumento.update({
        where: { id: argumentoId },
        data: { votos: { increment: 1 } },
      }),
    ]);

    // Award XP to argument author
    await awardXp({
      userId: argumento.userId,
      amount: XP_VOTO_RECIBIDO,
      category: "publicaciones",
      prisma,
      detalle: "Voto recibido en Expediente Abierto",
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[POST /api/expediente/[id]/votar]", error);
    return NextResponse.json(
      { error: "Error al votar" },
      { status: 500 }
    );
  }
}
