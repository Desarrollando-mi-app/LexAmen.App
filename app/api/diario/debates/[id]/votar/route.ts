import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── POST: Vote on a debate ─────────────────────────────────

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
    const { votoPara } = body as { votoPara: "autor1" | "autor2" };

    if (!votoPara || !["autor1", "autor2"].includes(votoPara)) {
      return NextResponse.json(
        { error: "votoPara debe ser 'autor1' o 'autor2'" },
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

    if (debate.estado !== "votacion") {
      return NextResponse.json(
        { error: "Este debate no esta en fase de votacion" },
        { status: 400 }
      );
    }

    // Cannot vote on your own debate
    if (debate.autor1Id === userId || debate.autor2Id === userId) {
      return NextResponse.json(
        { error: "No puedes votar en tu propio debate" },
        { status: 400 }
      );
    }

    // Check if already voted
    const existingVote = await prisma.debateVoto.findUnique({
      where: {
        debateId_userId: {
          debateId: id,
          userId,
        },
      },
    });

    if (existingVote) {
      return NextResponse.json(
        { error: "Ya votaste en este debate" },
        { status: 400 }
      );
    }

    // Create vote and increment counter in transaction
    await prisma.$transaction([
      prisma.debateVoto.create({
        data: {
          debateId: id,
          userId,
          votoPara,
        },
      }),
      prisma.debateJuridico.update({
        where: { id },
        data:
          votoPara === "autor1"
            ? { votosAutor1: { increment: 1 } }
            : { votosAutor2: { increment: 1 } },
      }),
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("Error voting:", error);
    return NextResponse.json(
      { error: "Error al votar" },
      { status: 500 }
    );
  }
}
