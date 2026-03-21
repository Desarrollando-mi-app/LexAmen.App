import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";

export async function POST() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  // Check not already completed
  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { onboardingCompleted: true },
  });
  if (!user)
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );
  if (user.onboardingCompleted) {
    return NextResponse.json({
      ok: true,
      xp: 0,
      mensaje: "Onboarding ya completado",
    });
  }

  // Mark completed
  await prisma.user.update({
    where: { id: authUser.id },
    data: { onboardingCompleted: true, onboardingStep: 5 },
  });

  // Award welcome XP
  await awardXp({
    userId: authUser.id,
    amount: 10,
    category: "bonus",
    detalle: "Bienvenida",
    prisma,
  });

  return NextResponse.json({
    ok: true,
    xp: 10,
    mensaje: "¡Bienvenido a Studio Iuris!",
  });
}
