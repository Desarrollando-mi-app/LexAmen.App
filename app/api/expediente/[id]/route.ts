import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";

// GET /api/expediente/[id] — Detail
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // Auth is optional for reading
    let authUserId: string | null = null;
    try {
      const supabase = await createClient();
      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();
      authUserId = authUser?.id ?? null;
    } catch {
      // Not authenticated — ok for public read
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id },
      include: {
        argumentos: {
          where: { parentId: null },
          orderBy: { votos: "desc" },
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatarUrl: true,
                grado: true,
              },
            },
            contraArgumentos: {
              orderBy: { createdAt: "asc" },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                    grado: true,
                  },
                },
                votosRecibidos: authUserId
                  ? { where: { userId: authUserId }, select: { id: true } }
                  : false,
                _count: { select: { votosRecibidos: true, comentarios: true } },
              },
            },
            comentarios: {
              orderBy: { createdAt: "asc" },
              include: {
                user: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    avatarUrl: true,
                  },
                },
              },
            },
            votosRecibidos: authUserId
              ? { where: { userId: authUserId }, select: { id: true } }
              : false,
            _count: { select: { votosRecibidos: true, comentarios: true } },
          },
        },
      },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    // Build estadisticas
    const allArgs = expediente.argumentos;
    const totalArgumentos = allArgs.length;
    const argumentosDemandante = allArgs.filter(
      (a) => a.bando === "demandante"
    ).length;
    const argumentosDemandado = allArgs.filter(
      (a) => a.bando === "demandado"
    ).length;

    let totalVotos = 0;
    let totalComentarios = 0;
    for (const arg of allArgs) {
      totalVotos += arg.votos;
      totalComentarios += arg._count.comentarios;
      for (const contra of arg.contraArgumentos) {
        totalVotos += contra.votos;
        totalComentarios += contra._count.comentarios;
      }
    }

    // Enrich argumentos for authenticated user
    const argumentos = allArgs.map((arg) => {
      const yaVotado =
        authUserId && Array.isArray(arg.votosRecibidos)
          ? arg.votosRecibidos.length > 0
          : false;

      const contraArgumentos = arg.contraArgumentos.map((contra) => {
        const contraYaVotado =
          authUserId && Array.isArray(contra.votosRecibidos)
            ? contra.votosRecibidos.length > 0
            : false;
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { votosRecibidos: _vr, ...contraRest } = contra;
        return { ...contraRest, yaVotado: contraYaVotado };
      });

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { votosRecibidos: _vr, ...argRest } = arg;
      return { ...argRest, yaVotado, contraArgumentos };
    });

    // Check if current user has an argument
    const miArgumento = authUserId
      ? allArgs.find((a) => a.userId === authUserId) ?? null
      : null;

    // Check if user can vote (grado)
    let puedeVotar = false;
    if (authUserId) {
      const dbUser = await prisma.user.findUnique({
        where: { id: authUserId },
        select: { grado: true },
      });
      const { VOTING_MIN_GRADO } = await import("@/lib/expediente-config");
      puedeVotar = (dbUser?.grado ?? 0) >= VOTING_MIN_GRADO;
    }

    // Build response
    const isCerrado =
      expediente.estado === "cerrado" || expediente.estado === "editorial";

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { argumentos: _rawArgs, ...expRest } = expediente;

    const response: Record<string, unknown> = {
      ...expRest,
      argumentos,
      estadisticas: {
        totalArgumentos,
        argumentosDemandante,
        argumentosDemandado,
        totalVotos,
        totalComentarios,
      },
    };

    if (authUserId) {
      response.miArgumento = miArgumento?.id ?? null;
      response.puedeVotar = puedeVotar;
    }

    if (isCerrado) {
      response.cierreEditorial = expediente.cierreEditorial;
      response.mejorArgumentoId = expediente.mejorArgumentoId;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error("[GET /api/expediente/[id]]", error);
    return NextResponse.json(
      { error: "Error al obtener expediente" },
      { status: 500 }
    );
  }
}

// PATCH /api/expediente/[id] — Update (admin only)
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: authUser.id },
      select: { isAdmin: true },
    });

    if (!admin?.isAdmin) {
      return NextResponse.json({ error: "Solo admin" }, { status: 403 });
    }

    const body = await request.json();
    const {
      titulo,
      hechos,
      pregunta,
      rama,
      materias,
      dificultad,
      bandoDemandante,
      bandoDemandado,
      fechaCierre,
      estado,
      cierreEditorial,
    } = body;

    const data: Record<string, unknown> = {};
    if (titulo !== undefined) data.titulo = titulo;
    if (hechos !== undefined) data.hechos = hechos;
    if (pregunta !== undefined) data.pregunta = pregunta;
    if (rama !== undefined) data.rama = rama;
    if (materias !== undefined) data.materias = materias;
    if (dificultad !== undefined) data.dificultad = dificultad;
    if (bandoDemandante !== undefined) data.bandoDemandante = bandoDemandante;
    if (bandoDemandado !== undefined) data.bandoDemandado = bandoDemandado;
    if (fechaCierre !== undefined) data.fechaCierre = new Date(fechaCierre);
    if (estado !== undefined) data.estado = estado;
    if (cierreEditorial !== undefined) data.cierreEditorial = cierreEditorial;

    const expediente = await prisma.expediente.update({
      where: { id },
      data,
    });

    return NextResponse.json({ expediente });
  } catch (error) {
    console.error("[PATCH /api/expediente/[id]]", error);
    return NextResponse.json(
      { error: "Error al actualizar expediente" },
      { status: 500 }
    );
  }
}
