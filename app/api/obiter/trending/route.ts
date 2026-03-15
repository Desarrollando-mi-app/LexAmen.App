import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// ─── GET: Trending data for sidebar (48h window) ────────────

export async function GET() {
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000);

  try {
    const [materiasTrending, mostCited, unansweredQuestion] =
      await Promise.all([
        // 1. Materias populares — top 3
        prisma.obiterDictum.groupBy({
          by: ["materia"],
          where: {
            createdAt: { gte: cutoff },
            materia: { not: null },
          },
          _count: { id: true },
          _sum: { apoyosCount: true },
          orderBy: { _count: { id: "desc" } },
          take: 3,
        }),

        // 2. Obiter más citado de las últimas 48h
        prisma.obiterDictum.findFirst({
          where: {
            createdAt: { gte: cutoff },
            citasCount: { gt: 0 },
          },
          orderBy: { citasCount: "desc" },
          select: {
            id: true,
            content: true,
            citasCount: true,
            apoyosCount: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        }),

        // 3. Pregunta sin respuesta con más apoyos
        prisma.obiterDictum.findFirst({
          where: {
            tipo: "pregunta",
            citasCount: 0,
            apoyosCount: { gte: 3 },
          },
          orderBy: { apoyosCount: "desc" },
          select: {
            id: true,
            content: true,
            apoyosCount: true,
            citasCount: true,
            user: {
              select: {
                firstName: true,
                lastName: true,
              },
            },
          },
        }),
      ]);

    return NextResponse.json({
      materias: materiasTrending.map((m) => ({
        materia: m.materia,
        count: m._count.id,
        apoyos: m._sum.apoyosCount ?? 0,
      })),
      mostCited: mostCited
        ? {
            id: mostCited.id,
            content:
              mostCited.content.length > 120
                ? mostCited.content.slice(0, 120) + "…"
                : mostCited.content,
            citasCount: mostCited.citasCount,
            apoyosCount: mostCited.apoyosCount,
            userName: `${mostCited.user.firstName} ${mostCited.user.lastName[0]}.`,
          }
        : null,
      unansweredQuestion: unansweredQuestion
        ? {
            id: unansweredQuestion.id,
            content:
              unansweredQuestion.content.length > 120
                ? unansweredQuestion.content.slice(0, 120) + "…"
                : unansweredQuestion.content,
            apoyosCount: unansweredQuestion.apoyosCount,
            citasCount: unansweredQuestion.citasCount,
            userName: `${unansweredQuestion.user.firstName} ${unansweredQuestion.user.lastName[0]}.`,
          }
        : null,
    });
  } catch {
    return NextResponse.json(
      { materias: [], mostCited: null, unansweredQuestion: null },
      { status: 200 }
    );
  }
}
