import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  // 1. Auth
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Body
  let body: { examDate: string | null };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { examDate } = body;

  // 3. Validar fecha
  let parsedDate: Date | null = null;
  if (examDate !== null && examDate !== undefined) {
    parsedDate = new Date(examDate);
    if (isNaN(parsedDate.getTime())) {
      return NextResponse.json(
        { error: "Fecha inválida" },
        { status: 400 }
      );
    }
  }

  // 4. Actualizar
  const updated = await prisma.user.update({
    where: { id: authUser.id },
    data: { examDate: parsedDate },
    select: { examDate: true },
  });

  return NextResponse.json({
    examDate: updated.examDate?.toISOString() ?? null,
  });
}
