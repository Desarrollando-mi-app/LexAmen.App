import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  // 1. Autenticar
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  // 2. Parsear body
  let body: { flashcardId: string; action: "add" | "remove" };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const { flashcardId, action } = body;

  if (!flashcardId || !["add", "remove"].includes(action)) {
    return NextResponse.json(
      { error: "flashcardId y action (add|remove) son requeridos" },
      { status: 400 }
    );
  }

  // 3. Ejecutar acción
  if (action === "add") {
    await prisma.flashcardFavorite.upsert({
      where: {
        userId_flashcardId: { userId: authUser.id, flashcardId },
      },
      update: {},
      create: {
        userId: authUser.id,
        flashcardId,
      },
    });
  } else {
    await prisma.flashcardFavorite.deleteMany({
      where: { userId: authUser.id, flashcardId },
    });
  }

  return NextResponse.json({ ok: true });
}
