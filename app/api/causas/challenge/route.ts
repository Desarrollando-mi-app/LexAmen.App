import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { CAUSA_QUESTIONS } from "@/lib/causa";

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Body
  let body: { opponentEmail: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { opponentEmail } = body;

  if (!opponentEmail) {
    return NextResponse.json(
      { error: "opponentEmail es requerido" },
      { status: 400 }
    );
  }

  // 3. Buscar oponente
  const opponent = await prisma.user.findUnique({
    where: { email: opponentEmail },
    select: { id: true, firstName: true, lastName: true },
  });

  if (!opponent) {
    return NextResponse.json(
      { error: "Usuario no encontrado con ese email" },
      { status: 404 }
    );
  }

  if (opponent.id === authUser.id) {
    return NextResponse.json(
      { error: "No puedes retarte a ti mismo" },
      { status: 400 }
    );
  }

  // 4. Verificar que no haya causa PENDING o ACTIVE entre ambos
  const existingCausa = await prisma.causa.findFirst({
    where: {
      OR: [
        { challengerId: authUser.id, challengedId: opponent.id },
        { challengerId: opponent.id, challengedId: authUser.id },
      ],
      status: { in: ["PENDING", "ACTIVE"] },
    },
  });

  if (existingCausa) {
    return NextResponse.json(
      { error: "Ya existe una causa activa o pendiente con este usuario" },
      { status: 409 }
    );
  }

  // 5. Seleccionar MCQs random
  const totalMcqs = await prisma.mCQ.count();
  if (totalMcqs < CAUSA_QUESTIONS) {
    return NextResponse.json(
      { error: "No hay suficientes preguntas MCQ disponibles" },
      { status: 400 }
    );
  }

  // Obtener IDs random usando skip aleatorio
  const mcqIds: string[] = [];
  const usedSkips = new Set<number>();

  while (mcqIds.length < CAUSA_QUESTIONS) {
    let skip: number;
    do {
      skip = Math.floor(Math.random() * totalMcqs);
    } while (usedSkips.has(skip));
    usedSkips.add(skip);

    const mcq = await prisma.mCQ.findFirst({
      skip,
      select: { id: true },
    });

    if (mcq && !mcqIds.includes(mcq.id)) {
      mcqIds.push(mcq.id);
    }
  }

  // 6. Crear Causa + CausaAnswer shells (10 por jugador = 20 total)
  const causa = await prisma.causa.create({
    data: {
      challengerId: authUser.id,
      challengedId: opponent.id,
      answers: {
        create: mcqIds.flatMap((mcqId, idx) => [
          {
            userId: authUser.id,
            mcqId,
            questionIdx: idx,
          },
          {
            userId: opponent.id,
            mcqId,
            questionIdx: idx,
          },
        ]),
      },
    },
  });

  return NextResponse.json({
    causaId: causa.id,
    opponentName: `${opponent.firstName} ${opponent.lastName}`,
    questions: CAUSA_QUESTIONS,
  });
}
