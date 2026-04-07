import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isValidExerciseType, exerciseCode, TYPE_TO_PRISMA_MODEL, type ExerciseType } from "@/lib/exercise-codes";

// Non-exercise types still supported (Obiter, Analisis, Ensayo)
const NON_EXERCISE_TYPES = ["Obiter", "Analisis", "Ensayo"];

export async function POST(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parse body
  let body: {
    contentType: string;
    contentId: string;
    reason: string;
    description?: string;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { contentType, contentId, reason, description } = body;

  // 3. Validate
  if (!contentType || (!isValidExerciseType(contentType) && !NON_EXERCISE_TYPES.includes(contentType))) {
    return NextResponse.json({ error: "contentType inválido" }, { status: 400 });
  }
  if (!contentId) {
    return NextResponse.json({ error: "contentId es requerido" }, { status: 400 });
  }
  if (!reason) {
    return NextResponse.json({ error: "reason es requerido" }, { status: 400 });
  }

  // 4. Build snapshot if it's an exercise type
  let snapshot: unknown = null;
  let code: string | null = null;
  if (isValidExerciseType(contentType)) {
    code = exerciseCode(contentType as ExerciseType, contentId);
    const modelKey = TYPE_TO_PRISMA_MODEL[contentType as ExerciseType];
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const delegate = (prisma as any)[modelKey];
      if (delegate) {
        snapshot = await delegate.findUnique({ where: { id: contentId } });
      }
    } catch {
      // Snapshot is best-effort; if it fails we still save the report
    }
  }

  // 5. Create report
  await prisma.contentReport.create({
    data: {
      userId: authUser.id,
      contentType,
      contentId,
      exerciseCode: code,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      exerciseSnapshot: snapshot as any,
      reason,
      description: description || null,
    },
  });

  return NextResponse.json({ success: true, exerciseCode: code });
}
