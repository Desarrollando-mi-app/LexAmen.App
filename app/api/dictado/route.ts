import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isFreePlan } from "@/lib/plan-utils";
import { buildRamaFilter } from "@/lib/rama-filter";

/**
 * GET /api/dictado — list active dictados (PAID ONLY)
 * Returns items WITHOUT textoCompleto (that's the answer).
 * Supports ?rama filter.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const dbUser = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { plan: true, isAdmin: true },
  });

  if (!dbUser) {
    return NextResponse.json({ error: "Usuario no encontrado" }, { status: 404 });
  }

  if (isFreePlan(dbUser)) {
    return NextResponse.json(
      { error: "Dictado Juridico es exclusivo para planes de pago." },
      { status: 403 },
    );
  }

  // Optional rama filter
  const { searchParams } = request.nextUrl;
  const rama = searchParams.get("rama");

  // Respeta ramasAdicionales (Fase 7)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: any = { activo: true };
  const ramaFilter = buildRamaFilter(rama);
  if (ramaFilter) Object.assign(where, ramaFilter);

  const items = await prisma.dictadoJuridico.findMany({
    where,
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      titulo: true,
      rama: true,
      libro: true,
      dificultad: true,
      tituloMateria: true,
      materia: true,
    },
  });

  return NextResponse.json({ items });
}
