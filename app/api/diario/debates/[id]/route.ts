import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Debate Detail ──────────────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  const debate = await prisma.debateJuridico.findUnique({
    where: { id },
    include: {
      autor1: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
      autor2: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatarUrl: true,
          grado: true,
        },
      },
    },
  });

  if (!debate) {
    return NextResponse.json(
      { error: "Debate no encontrado" },
      { status: 404 }
    );
  }

  // Check if auth user has voted
  let yaVotado = false;
  let votoPara: string | null = null;

  if (authUser) {
    const voto = await prisma.debateVoto.findUnique({
      where: {
        debateId_userId: {
          debateId: id,
          userId: authUser.id,
        },
      },
    });

    if (voto) {
      yaVotado = true;
      votoPara = voto.votoPara;
    }
  }

  return NextResponse.json({
    debate,
    yaVotado,
    votoPara,
  });
}
