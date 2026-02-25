import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const VALID_CONTENT_TYPES = ["FLASHCARD", "MCQ", "TRUEFALSE"];

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

  // 3. Validar campos
  if (!contentType || !VALID_CONTENT_TYPES.includes(contentType)) {
    return NextResponse.json(
      { error: "contentType debe ser FLASHCARD, MCQ o TRUEFALSE" },
      { status: 400 }
    );
  }

  if (!contentId) {
    return NextResponse.json(
      { error: "contentId es requerido" },
      { status: 400 }
    );
  }

  if (!reason) {
    return NextResponse.json(
      { error: "reason es requerido" },
      { status: 400 }
    );
  }

  // 4. Crear reporte
  await prisma.contentReport.create({
    data: {
      userId: authUser.id,
      contentType,
      contentId,
      reason,
      description: description || null,
    },
  });

  return NextResponse.json({ success: true });
}
