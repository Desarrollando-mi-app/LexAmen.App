import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// ─── GET /api/admin/peer-review/postulaciones ──────────────
//
// Listar postulaciones para revisión por admin. Soporta `?estado=...`
// para filtrar (default: pendiente).

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser) {
    return NextResponse.json({ error: "No autenticado" }, { status: 401 });
  }

  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin) {
    return NextResponse.json({ error: "No autorizado" }, { status: 403 });
  }

  const url = request.nextUrl;
  const estado = url.searchParams.get("estado") ?? "pendiente";

  const validos = ["pendiente", "aprobada", "rechazada", "todas"];
  if (!validos.includes(estado)) {
    return NextResponse.json({ error: "Estado inválido." }, { status: 400 });
  }

  const where = estado === "todas" ? {} : { estado };

  const postulaciones = await prisma.peerReviewPostulacion.findMany({
    where,
    orderBy: [{ estado: "asc" }, { createdAt: "desc" }],
    include: {
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          avatarUrl: true,
          grado: true,
          xp: true,
          etapaActual: true,
          universidad: true,
          isPeerReviewer: true,
        },
      },
      resueltoPor: {
        select: { id: true, firstName: true, lastName: true },
      },
    },
  });

  // Conteo de publicaciones por usuario para context.
  const userIds = postulaciones.map((p) => p.user.id);
  const [analisisCounts, ensayoCounts] = await Promise.all([
    prisma.analisisSentencia.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, isActive: true },
      _count: { id: true },
    }),
    prisma.ensayo.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, isActive: true },
      _count: { id: true },
    }),
  ]);

  const publicacionesByUser = new Map<string, number>();
  for (const a of analisisCounts) {
    publicacionesByUser.set(a.userId, (publicacionesByUser.get(a.userId) ?? 0) + a._count.id);
  }
  for (const e of ensayoCounts) {
    publicacionesByUser.set(e.userId, (publicacionesByUser.get(e.userId) ?? 0) + e._count.id);
  }

  return NextResponse.json({
    postulaciones: postulaciones.map((p) => ({
      ...p,
      user: {
        ...p.user,
        publicacionesCount: publicacionesByUser.get(p.user.id) ?? 0,
      },
    })),
  });
}
