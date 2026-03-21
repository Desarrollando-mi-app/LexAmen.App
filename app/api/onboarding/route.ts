import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: {
      onboardingCompleted: true,
      onboardingStep: true,
      etapaActual: true,
      universidad: true,
      sede: true,
      anioIngreso: true,
      anioEgreso: true,
      anioJura: true,
      intereses: true,
    },
  });

  if (!user)
    return NextResponse.json(
      { error: "Usuario no encontrado" },
      { status: 404 }
    );

  return NextResponse.json({
    completed: user.onboardingCompleted,
    currentStep: user.onboardingStep,
    userData: {
      etapaActual: user.etapaActual,
      universidad: user.universidad,
      sede: user.sede,
      anioIngreso: user.anioIngreso,
      anioEgreso: user.anioEgreso,
      anioJura: user.anioJura,
      intereses: user.intereses ? JSON.parse(user.intereses) : [],
    },
  });
}

export async function PATCH(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser)
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await request.json();
  const { step, data, reset } = body;

  // Reset onboarding
  if (reset) {
    await prisma.user.update({
      where: { id: authUser.id },
      data: { onboardingCompleted: false, onboardingStep: 0 },
    });
    return NextResponse.json({ ok: true, reset: true });
  }

  if (typeof step !== "number" || step < 1 || step > 4) {
    return NextResponse.json({ error: "Step inválido" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { onboardingStep: step };

  // Step 1: etapa
  if (step === 1 && data?.etapaActual) {
    updateData.etapaActual = data.etapaActual;
  }
  // Step 2: universidad
  if (step === 2) {
    if (data?.universidad) updateData.universidad = data.universidad;
    if (data?.sede) updateData.sede = data.sede;
    if (data?.anioIngreso) updateData.anioIngreso = data.anioIngreso;
    if (data?.anioEgreso) updateData.anioEgreso = data.anioEgreso;
    if (data?.anioJura) updateData.anioJura = data.anioJura;
  }
  // Step 3: interests
  if (step === 3 && data?.ramasInteres) {
    updateData.intereses = JSON.stringify(data.ramasInteres);
  }
  // Step 4: flashcard done (no extra data needed)

  await prisma.user.update({
    where: { id: authUser.id },
    data: updateData,
  });

  return NextResponse.json({ ok: true, step });
}
