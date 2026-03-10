import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

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
