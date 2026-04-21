import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Evitar prerender/SSG en build: esta ruta consulta la DB en cada request.
export const dynamic = "force-dynamic";
export const revalidate = 0;

// ─── GET: Contingencias publicas (top hashtags trending) ──

export async function GET() {
  const items = await prisma.diarioHashtag.findMany({
    where: { isContingencia: true, hidden: false },
    orderBy: [{ pinned: "desc" }, { count: "desc" }],
    take: 10,
    select: {
      id: true,
      tag: true,
      count: true,
      pinned: true,
    },
  });

  return NextResponse.json({ items });
}
