import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { calculateSM2 } from "@/lib/sm2";

const DAILY_FREE_LIMIT = 30;

export async function POST(request: Request) {
  // 1. Autenticar usuario
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parsear body
  let body: { flashcardId: string; quality: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { flashcardId, quality } = body;

  // 3. Validar quality
  if (![0, 3, 5].includes(quality)) {
    return NextResponse.json(
      { error: "quality debe ser 0, 3 o 5" },
      { status: 400 }
    );
  }

  if (!flashcardId) {
    return NextResponse.json(
      { error: "flashcardId es requerido" },
      { status: 400 }
    );
  }

  // 4. Obtener usuario de Prisma para verificar plan
  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true },
  });

  if (!dbUser) {
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  }

  // 5. Verificar límite diario para plan FREE
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  const reviewsToday = await prisma.userFlashcardProgress.count({
    where: {
      userId: authUser.id,
      lastReviewedAt: { gte: startOfToday },
    },
  });

  if (dbUser.plan === "FREE" && reviewsToday >= DAILY_FREE_LIMIT) {
    return NextResponse.json(
      {
        error: "Has alcanzado el límite de 30 revisiones diarias.",
        limit: true,
        reviewsToday,
      },
      { status: 403 }
    );
  }

  // 6. Buscar progreso existente
  const existingProgress = await prisma.userFlashcardProgress.findUnique({
    where: {
      userId_flashcardId: { userId: authUser.id, flashcardId },
    },
  });

  // 7. Calcular SM-2
  const sm2Result = calculateSM2({
    quality,
    repetitions: existingProgress?.repetitions ?? 0,
    interval: existingProgress?.interval ?? 0,
    easeFactor: existingProgress?.easeFactor ?? 2.5,
  });

  // 8. Upsert progreso
  await prisma.userFlashcardProgress.upsert({
    where: {
      userId_flashcardId: { userId: authUser.id, flashcardId },
    },
    update: {
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewAt: sm2Result.nextReviewAt,
      lastReviewedAt: new Date(),
    },
    create: {
      userId: authUser.id,
      flashcardId,
      easeFactor: sm2Result.easeFactor,
      interval: sm2Result.interval,
      repetitions: sm2Result.repetitions,
      nextReviewAt: sm2Result.nextReviewAt,
      lastReviewedAt: new Date(),
    },
  });

  // 9. Detectar completación de submateria
  let completedSubmateria: string | null = null;

  const flashcard = await prisma.flashcard.findUnique({
    where: { id: flashcardId },
    select: { submateria: true },
  });

  if (flashcard && sm2Result.repetitions >= 3) {
    const totalInSubmateria = await prisma.flashcard.count({
      where: { submateria: flashcard.submateria },
    });

    const dominatedInSubmateria = await prisma.userFlashcardProgress.count({
      where: {
        userId: authUser.id,
        repetitions: { gte: 3 },
        flashcard: { submateria: flashcard.submateria },
      },
    });

    if (dominatedInSubmateria >= totalInSubmateria && totalInSubmateria > 0) {
      // Submateria completada — incrementar vuelta y resetear
      await prisma.curriculumProgress.upsert({
        where: {
          userId_submateria: {
            userId: authUser.id,
            submateria: flashcard.submateria,
          },
        },
        update: {
          completions: { increment: 1 },
          lastCompletedAt: new Date(),
        },
        create: {
          userId: authUser.id,
          submateria: flashcard.submateria,
          completions: 1,
          lastCompletedAt: new Date(),
        },
      });

      // Resetear progreso de flashcards de esa submateria
      await prisma.userFlashcardProgress.updateMany({
        where: {
          userId: authUser.id,
          flashcard: { submateria: flashcard.submateria },
        },
        data: {
          repetitions: 0,
          interval: 0,
          nextReviewAt: new Date(),
        },
      });

      completedSubmateria = flashcard.submateria;
    }
  }

  // 10. Retornar resultado
  return NextResponse.json({
    nextReviewAt: sm2Result.nextReviewAt.toISOString(),
    newInterval: sm2Result.interval,
    newEaseFactor: sm2Result.easeFactor,
    reviewsToday: reviewsToday + 1,
    ...(completedSubmateria && { completedSubmateria }),
  });
}
