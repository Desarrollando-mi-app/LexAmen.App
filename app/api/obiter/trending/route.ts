import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Contingencia — trending hashtags + spotlight ─────────
//
// Score de un hashtag = uses + replies*1.5 + apoyos*0.5 en últimos 7 días.
// Un hashtag "trend" combina volumen (cuántos OD lo usan) con engagement
// (cuántas respuestas/apoyos generan esos OD). Esto evita que un solo
// OD muy apoyado domine, y premia los temas que la comunidad activa.

const TRENDING_WINDOW_DAYS = 7;
const TRENDING_LIMIT = 8;

type TrendingHashtag = {
  tag: string;
  uses: number; // # de OD distintos con ese tag
  apoyos: number; // suma de apoyos en OD con ese tag
  replies: number; // suma de replies en OD con ese tag
  score: number;
  delta: number; // diferencia con la ventana anterior (% growth)
};

type SpotlightOd = {
  id: string;
  content: string;
  apoyosCount: number;
  citasCount: number;
  replyCount: number;
  hashtags: string[];
  userName: string;
} | null;

export async function GET() {
  const now = Date.now();
  const cutoff = new Date(now - TRENDING_WINDOW_DAYS * 86400000);
  const prevCutoff = new Date(now - 2 * TRENDING_WINDOW_DAYS * 86400000);

  try {
    // ─── 1. Trending hashtags via $queryRaw (groupBy con array unnest) ──
    type HashtagRow = {
      tag: string;
      uses: bigint;
      apoyos: bigint;
      replies: bigint;
    };

    const rawTrending = await prisma.$queryRaw<HashtagRow[]>`
      SELECT
        tag,
        COUNT(*) AS uses,
        SUM("apoyosCount")::bigint AS apoyos,
        SUM(COALESCE("replyCount", 0))::bigint AS replies
      FROM (
        SELECT id, "apoyosCount", "replyCount", UNNEST(hashtags) AS tag
        FROM "ObiterDictum"
        WHERE "createdAt" >= ${cutoff}
          AND archived = false
      ) AS expanded
      GROUP BY tag
      HAVING COUNT(*) >= 1
      ORDER BY (
        COUNT(*) +
        SUM(COALESCE("replyCount", 0)) * 1.5 +
        SUM("apoyosCount") * 0.5
      ) DESC
      LIMIT ${TRENDING_LIMIT}
    `;

    // Ventana anterior — para calcular delta de cada tag
    const prevWindowTags = rawTrending.length > 0
      ? rawTrending.map((r) => r.tag)
      : [];
    const prevUsesByTag: Record<string, number> = {};
    if (prevWindowTags.length > 0) {
      const prevRows = await prisma.$queryRaw<{ tag: string; uses: bigint }[]>`
        SELECT tag, COUNT(*) AS uses
        FROM (
          SELECT id, UNNEST(hashtags) AS tag
          FROM "ObiterDictum"
          WHERE "createdAt" >= ${prevCutoff}
            AND "createdAt" < ${cutoff}
            AND archived = false
        ) AS expanded
        WHERE tag = ANY(${prevWindowTags})
        GROUP BY tag
      `;
      for (const r of prevRows) {
        prevUsesByTag[r.tag] = Number(r.uses);
      }
    }

    const trending: TrendingHashtag[] = rawTrending.map((r) => {
      const uses = Number(r.uses);
      const apoyos = Number(r.apoyos);
      const replies = Number(r.replies);
      const score = uses + replies * 1.5 + apoyos * 0.5;
      const prevUses = prevUsesByTag[r.tag] ?? 0;
      const delta =
        prevUses === 0
          ? uses > 0
            ? 100
            : 0
          : Math.round(((uses - prevUses) / prevUses) * 100);
      return { tag: r.tag, uses, apoyos, replies, score, delta };
    });

    // ─── 2. Spotlight: OD con más engagement reciente ──
    const spotlight = await prisma.obiterDictum.findFirst({
      where: {
        createdAt: { gte: cutoff },
        archived: false,
        parentObiterId: null,
      },
      orderBy: [
        { replyCount: "desc" },
        { apoyosCount: "desc" },
      ],
      select: {
        id: true,
        content: true,
        apoyosCount: true,
        citasCount: true,
        replyCount: true,
        hashtags: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    // ─── 3. Pregunta sin respuesta con más apoyos ──
    const unanswered = await prisma.obiterDictum.findFirst({
      where: {
        tipo: "pregunta",
        replyCount: 0,
        apoyosCount: { gte: 2 },
        archived: false,
      },
      orderBy: { apoyosCount: "desc" },
      select: {
        id: true,
        content: true,
        apoyosCount: true,
        citasCount: true,
        replyCount: true,
        hashtags: true,
        user: { select: { firstName: true, lastName: true } },
      },
    });

    const snippet = (s: string, n: number) =>
      s.length > n ? s.slice(0, n) + "…" : s;
    const fmt = (o: NonNullable<typeof spotlight>): SpotlightOd => ({
      id: o.id,
      content: snippet(o.content, 140),
      apoyosCount: o.apoyosCount,
      citasCount: o.citasCount,
      replyCount: (o as { replyCount?: number }).replyCount ?? 0,
      hashtags: (o as { hashtags?: string[] }).hashtags ?? [],
      userName: `${o.user.firstName} ${o.user.lastName[0]}.`,
    });

    return NextResponse.json({
      trendingHashtags: trending,
      spotlight: spotlight ? fmt(spotlight) : null,
      unansweredQuestion: unanswered ? fmt(unanswered) : null,
      windowDays: TRENDING_WINDOW_DAYS,
    });
  } catch (err) {
    console.warn("[trending] failed:", err);
    return NextResponse.json(
      {
        trendingHashtags: [],
        spotlight: null,
        unansweredQuestion: null,
        windowDays: TRENDING_WINDOW_DAYS,
      },
      { status: 200 }
    );
  }
}
