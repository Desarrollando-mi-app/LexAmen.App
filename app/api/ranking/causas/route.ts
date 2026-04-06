import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/ranking/causas
 * Query params:
 *   vista: "nacional" | "regiones" | "region" | "corte" | "universidades" | "universidad" | "sede"
 *   region?: string
 *   corte?: string
 *   universidad?: string (alias: u)
 *   sede?: string (alias: s)
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
  const vista = searchParams.get("vista") ?? "nacional";
  const region = searchParams.get("region");
  const corte = searchParams.get("corte");
  const universidad = searchParams.get("universidad") ?? searchParams.get("u");
  const sede = searchParams.get("sede") ?? searchParams.get("s");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = parseInt(searchParams.get("limit") ?? "50");
  const offset = (page - 1) * limit;

  // ─── Vista: Regiones (aggregate by region) ────────────
  if (vista === "regiones") {
    const users = await prisma.user.findMany({
      where: { visibleEnRanking: true, region: { not: null } },
      select: { region: true, causasGanadas: true },
    });
    const regionMap: Record<string, { totalUsuarios: number; totalGanadas: number }> = {};
    for (const u of users) {
      if (!u.region) continue;
      if (!regionMap[u.region]) regionMap[u.region] = { totalUsuarios: 0, totalGanadas: 0 };
      regionMap[u.region].totalUsuarios++;
      regionMap[u.region].totalGanadas += u.causasGanadas;
    }
    const items = Object.entries(regionMap)
      .map(([r, data], i) => ({ rank: i + 1, region: r, ...data }))
      .sort((a, b) => b.totalGanadas - a.totalGanadas)
      .map((item, i) => ({ ...item, rank: i + 1 }));
    return NextResponse.json({ items });
  }

  // ─── Vista: Universidades (aggregate by universidad) ───
  if (vista === "universidades") {
    const users = await prisma.user.findMany({
      where: { visibleEnRanking: true, universidad: { not: null } },
      select: { universidad: true, sede: true, causasGanadas: true },
    });
    const univMap: Record<string, { totalUsuarios: number; totalGanadas: number; sedeCount: Set<string> }> = {};
    for (const u of users) {
      if (!u.universidad) continue;
      if (!univMap[u.universidad]) univMap[u.universidad] = { totalUsuarios: 0, totalGanadas: 0, sedeCount: new Set() };
      univMap[u.universidad].totalUsuarios++;
      univMap[u.universidad].totalGanadas += u.causasGanadas;
      if (u.sede) univMap[u.universidad].sedeCount.add(u.sede);
    }
    const items = Object.entries(univMap)
      .map(([univ, data]) => ({
        rank: 0,
        universidad: univ,
        totalUsuarios: data.totalUsuarios,
        totalGanadas: data.totalGanadas,
        sedeCount: data.sedeCount.size,
      }))
      .sort((a, b) => b.totalGanadas - a.totalGanadas)
      .map((item, i) => ({ ...item, rank: i + 1 }));
    return NextResponse.json({ items });
  }

  // ─── Vista: Sedes de una universidad ───────────────────
  if (vista === "universidad" && universidad) {
    const users = await prisma.user.findMany({
      where: { visibleEnRanking: true, universidad, sede: { not: null } },
      select: { sede: true, causasGanadas: true },
    });
    const sedeMap: Record<string, { totalUsuarios: number; totalGanadas: number }> = {};
    for (const u of users) {
      if (!u.sede) continue;
      if (!sedeMap[u.sede]) sedeMap[u.sede] = { totalUsuarios: 0, totalGanadas: 0 };
      sedeMap[u.sede].totalUsuarios++;
      sedeMap[u.sede].totalGanadas += u.causasGanadas;
    }
    const items = Object.entries(sedeMap)
      .map(([s, data]) => ({ rank: 0, sede: s, ...data }))
      .sort((a, b) => b.totalGanadas - a.totalGanadas)
      .map((item, i) => ({ ...item, rank: i + 1 }));
    return NextResponse.json({ items });
  }

  // ─── Vista: Usuarios (nacional, region, corte, sede) ───
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const userWhere: any = { visibleEnRanking: true };
  if (vista === "region" && region) userWhere.region = region;
  if (vista === "corte" && corte) userWhere.corte = corte;
  if (vista === "sede" && universidad && sede) {
    userWhere.universidad = universidad;
    userWhere.sede = sede;
  }

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
        where: { room: { status: "finished" } },
        select: { position: true },
      },
    },
  });

  const ranked = users
    .map((u) => {
      const participaciones = u.causaParticipations.length;
      const ganadas = u.causaParticipations.filter((p) => p.position === 1).length;
      const porcentaje = participaciones > 0 ? Math.round((ganadas / participaciones) * 100) : 0;
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
    .filter((u) => u.causasJugadas > 0)
    .sort((a, b) => b.causasGanadas - a.causasGanadas || b.porcentajeVictoria - a.porcentajeVictoria);

  const total = ranked.length;
  const totalPages = Math.ceil(total / limit) || 1;
  const paginated = ranked.slice(offset, offset + limit).map((u, i) => ({
    ...u,
    rank: offset + i + 1,
  }));

  const myIdx = ranked.findIndex((u) => u.id === authUser.id);
  const miPosicion = myIdx >= 0 ? myIdx + 1 : null;

  return NextResponse.json({
    items: paginated,
    total,
    page,
    totalPages,
    miPosicion,
  });
}
