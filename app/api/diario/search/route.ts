import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Búsqueda unificada en el Diario ─────────────────────
//
// Query params:
//   q: texto a buscar (mínimo 2 chars). Soporta prefijos especiales:
//      "#tag"  → busca solo hashtags
//      "@user" → busca solo usuarios
//      "tema:" → busca solo OD (alias de búsqueda en content)
//      otherwise: búsqueda mixta (OD content + users + hashtags)
//
// Respuesta:
//   { hashtags: [{ tag, uses }], users: [...], obiters: [...] }
//
// Cap por categoría: 5 hashtags, 6 users, 10 obiters.

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const raw = request.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (raw.length < 2) {
    return NextResponse.json({ hashtags: [], users: [], obiters: [] });
  }

  // Detectar prefijo especial
  let mode: "hashtag" | "user" | "obiter" | "mixed" = "mixed";
  let q = raw;
  if (raw.startsWith("#")) {
    mode = "hashtag";
    q = raw.slice(1);
  } else if (raw.startsWith("@")) {
    mode = "user";
    q = raw.slice(1);
  } else if (raw.toLowerCase().startsWith("tema:")) {
    mode = "obiter";
    q = raw.slice(5).trim();
  }

  if (q.length < 1) {
    return NextResponse.json({ hashtags: [], users: [], obiters: [] });
  }

  const qLower = q.toLowerCase();

  // ─── Hashtags (groupBy de unnest filtrado por LIKE) ──
  type HashtagRow = { tag: string; uses: bigint };
  let hashtags: { tag: string; uses: number }[] = [];
  if (mode === "mixed" || mode === "hashtag") {
    try {
      const rows = await prisma.$queryRaw<HashtagRow[]>`
        SELECT tag, COUNT(*) AS uses
        FROM (
          SELECT id, UNNEST(hashtags) AS tag
          FROM "ObiterDictum"
          WHERE archived = false
        ) AS expanded
        WHERE tag LIKE ${qLower + "%"}
        GROUP BY tag
        ORDER BY uses DESC
        LIMIT 5
      `;
      hashtags = rows.map((r) => ({ tag: r.tag, uses: Number(r.uses) }));
    } catch (err) {
      console.warn("[search] hashtags failed:", err);
    }
  }

  // ─── Users ──
  let users: {
    id: string;
    firstName: string;
    lastName: string;
    handle: string | null;
    avatarUrl: string | null;
    universidad: string | null;
  }[] = [];
  if (mode === "mixed" || mode === "user") {
    users = await prisma.user.findMany({
      where: {
        OR: [
          { handle: { startsWith: qLower } },
          { firstName: { startsWith: q, mode: "insensitive" } },
          { lastName: { startsWith: q, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        handle: true,
        avatarUrl: true,
        universidad: true,
      },
      take: 6,
    });
  }

  // ─── Obiters (texto en content) ──
  type ObiterPreview = {
    id: string;
    content: string;
    createdAt: Date;
    apoyosCount: number;
    replyCount: number;
    user: {
      id: string;
      firstName: string;
      lastName: string;
      avatarUrl: string | null;
    };
  };
  let obiters: ObiterPreview[] = [];
  if (mode === "mixed" || mode === "obiter") {
    obiters = (await prisma.obiterDictum.findMany({
      where: {
        archived: false,
        content: { contains: q, mode: "insensitive" },
      },
      orderBy: [
        { apoyosCount: "desc" },
        { createdAt: "desc" },
      ],
      take: 10,
      select: {
        id: true,
        content: true,
        createdAt: true,
        apoyosCount: true,
        replyCount: true,
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatarUrl: true,
          },
        },
      },
    })) as ObiterPreview[];
  }

  function snippet(s: string, n: number) {
    return s.length > n ? s.slice(0, n) + "…" : s;
  }

  return NextResponse.json({
    hashtags,
    users,
    obiters: obiters.map((o) => ({
      id: o.id,
      content: snippet(o.content, 160),
      createdAt: o.createdAt.toISOString(),
      apoyosCount: o.apoyosCount,
      replyCount: o.replyCount ?? 0,
      user: o.user,
    })),
  });
}
