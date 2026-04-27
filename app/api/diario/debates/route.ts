import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";

// ─── GET: List Debates Juridicos ─────────────────────────────

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const estado = searchParams.get("estado");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = {};
  if (estado) {
    where.estado = estado;
  }

  const debates = await prisma.debateJuridico.findMany({
    where,
    orderBy: [{ createdAt: "desc" }],
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

  // Sort: active states first, then cerrado
  const ORDER: Record<string, number> = {
    votacion: 0,
    argumentos: 1,
    replicas: 2,
    buscando_oponente: 3,
    cerrado: 4,
  };

  debates.sort((a, b) => {
    const oa = ORDER[a.estado] ?? 5;
    const ob = ORDER[b.estado] ?? 5;
    if (oa !== ob) return oa - ob;
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  return NextResponse.json({ debates });
}

// ─── POST: Create Debate ─────────────────────────────────────

export async function POST(request: NextRequest) {
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
    const { titulo, descripcion, rama, materias, miPosicion } = body;

    if (!titulo || !descripcion || !rama || !miPosicion) {
      return NextResponse.json(
        { error: "Faltan campos requeridos" },
        { status: 400 }
      );
    }

    if (titulo.length < 10 || titulo.length > 200) {
      return NextResponse.json(
        { error: "El titulo debe tener entre 10 y 200 caracteres" },
        { status: 400 }
      );
    }

    if (descripcion.length < 30 || descripcion.length > 2000) {
      return NextResponse.json(
        { error: "La descripcion debe tener entre 30 y 2000 caracteres" },
        { status: 400 }
      );
    }

    if (miPosicion.length < 10 || miPosicion.length > 500) {
      return NextResponse.json(
        { error: "La posicion debe tener entre 10 y 500 caracteres" },
        { status: 400 }
      );
    }

    const debate = await prisma.debateJuridico.create({
      data: {
        titulo,
        descripcion,
        rama,
        materias: materias || null,
        autor1Id: userId,
        autor1Posicion: miPosicion,
        estado: "buscando_oponente",
      },
    });

    // Award XP
    await awardXp({
      userId,
      amount: 3,
      category: "publicaciones",
      prisma,
      detalle: "Debates",
    });

    // Evaluate badges
    await evaluateBadges(userId, "diario");

    // ─── Auto-OD-resumen en el feed principal ──────────────
    const { createSummaryObiter } = await import("@/lib/obiter-auto-summary");
    await createSummaryObiter(prisma, {
      kind: "debate_summary",
      userId,
      citedDebateId: debate.id,
      titulo: debate.titulo,
      excerpt: debate.descripcion,
      hashtagSeed: [debate.rama, "Debate"],
    });

    return NextResponse.json({ debate }, { status: 201 });
  } catch (error) {
    console.error("Error creating debate:", error);
    return NextResponse.json(
      { error: "Error al crear el debate" },
      { status: 500 }
    );
  }
}
