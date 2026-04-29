// ─── GET /api/investigaciones/search?q=... ────────────────────
//
// Buscador para el modal de citas del editor. Devuelve hasta 10
// investigaciones publicadas que matchean por título, firstName o
// lastName del autor (case-insensitive). Marca con `isCitable=false`
// las que tienen menos de 48h desde su publicación, e incluye
// `citableSince` para mostrar el tooltip.

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

const COOLDOWN_MS = 48 * 60 * 60 * 1000; // 48h

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();
  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ items: [] });
  }

  const items = await prisma.investigacion.findMany({
    where: {
      status: "published",
      OR: [
        { titulo: { contains: q, mode: "insensitive" } },
        { user: { firstName: { contains: q, mode: "insensitive" } } },
        { user: { lastName: { contains: q, mode: "insensitive" } } },
      ],
    },
    include: {
      user: {
        select: { firstName: true, lastName: true, avatarUrl: true },
      },
    },
    orderBy: [{ citationsInternal: "desc" }, { publishedAt: "desc" }],
    take: 10,
  });

  const now = Date.now();
  const result = items.map((inv) => {
    const publishedAtMs = inv.publishedAt.getTime();
    const isCitable = now - publishedAtMs >= COOLDOWN_MS;
    const citableSince = isCitable
      ? null
      : new Date(publishedAtMs + COOLDOWN_MS).toISOString();
    return {
      id: inv.id,
      titulo: inv.titulo,
      authorId: inv.userId,
      authorName: `${inv.user.firstName} ${inv.user.lastName}`,
      authorLastName: inv.user.lastName,
      authorAvatarUrl: inv.user.avatarUrl,
      tipo: inv.tipo,
      area: inv.area,
      publishedAt: inv.publishedAt.toISOString(),
      year: inv.publishedAt.getFullYear(),
      citationsInternal: inv.citationsInternal,
      isCitable,
      citableSince,
    };
  });

  return NextResponse.json({ items: result });
}
