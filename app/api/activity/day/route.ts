import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const dateParam = searchParams.get("date");

  if (!dateParam || !/^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
    return NextResponse.json({ error: "Invalid date" }, { status: 400 });
  }

  const start = new Date(dateParam + "T00:00:00");
  const end = new Date(dateParam + "T23:59:59.999");

  const [flashcards, mcq, truefalse] = await Promise.all([
    prisma.userFlashcardProgress.count({
      where: {
        userId: user.id,
        lastReviewedAt: { gte: start, lte: end },
      },
    }),
    prisma.userMCQAttempt.count({
      where: {
        userId: user.id,
        attemptedAt: { gte: start, lte: end },
      },
    }),
    prisma.userTrueFalseAttempt.count({
      where: {
        userId: user.id,
        attemptedAt: { gte: start, lte: end },
      },
    }),
  ]);

  return NextResponse.json({
    flashcards,
    mcq,
    truefalse,
    total: flashcards + mcq + truefalse,
  });
}
