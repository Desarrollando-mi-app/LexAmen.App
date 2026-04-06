import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ranking/causas
 * Query params:
 *   scope: "nacional" | "universidad" | "sede"
 *   universidad?: string
 *   sede?: string
 *   page?: number (default 1)
 *   limit?: number (default 50)
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope") ?? "nacional";
  const universidad = searchParams.get("universidad");
  const sede = searchParams.get("sede");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = (page - 1) * limit;

  // Build user filter based on scope
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userWhere: any = { visibleEnRanking: true };
  if (scope === "universidad" && universidad) {
    userWhere.universidad = universidad;
  } else if (scope === "sede" && universidad && sede) {
    userWhere.universidad = universidad;
    userWhere.sede = sede;
  }

  // Get all users matching scope with their causa participations
  const users = await prisma.user.findMany({
    where: userWhere,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      avatarUrl: true,
      grado: true,
      universidad: true,
      causasGanadas: true,
      causaParticipations: {
        where: {
          room: { status: "finished" },
        },
        select: {
          position: true,
        },
      },
    },
  });

  // Calculate stats for each user
  const ranked = users
    .map((u) => {
      const participaciones = u.causaParticipations.length;
      const ganadas = u.causaParticipations.filter(
        (p) => p.position === 1
      ).length;
      const porcentaje =
        participaciones > 0 ? Math.round((ganadas / participaciones) * 100) : 0;

      return {
        id: u.id,
        firstName: u.firstName,
        lastName: u.lastName ?? "",
        avatarUrl: u.avatarUrl,
        grado: u.grado,
        universidad: u.universidad,
        causasGanadas: ganadas,
        causasJugadas: participaciones,
        porcentajeVictoria: porcentaje,
      };
    })
    .filter((u) => u.causasJugadas > 0) // Only show users who have played
    .sort((a, b) => b.causasGanadas - a.causasGanadas || b.porcentajeVictoria - a.porcentajeVictoria);

  // Add ranks
  const total = ranked.length;
  const paginated = ranked.slice(offset, offset + limit).map((u, i) => ({
    ...u,
    rank: offset + i + 1,
  }));

  // Find current user's position
  const myIdx = ranked.findIndex((u) => u.id === authUser.id);
  const miPosicion = myIdx >= 0 ? myIdx + 1 : null;

  return NextResponse.json({
    usuarios: paginated,
    total,
    page,
    miPosicion,
  });
}
