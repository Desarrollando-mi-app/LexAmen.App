import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { sendNotification } from "@/lib/notifications";
import { MAX_CHARS_COMENTARIO } from "@/lib/expediente-config";

// POST /api/expediente/[id]/comentar
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: expedienteId } = await params;

    const supabase = await createClient();
    const {
      data: { user: authUser },
    } = await supabase.auth.getUser();

    if (!authUser) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const expediente = await prisma.expediente.findUnique({
      where: { id: expedienteId },
      select: { estado: true, titulo: true },
    });

    if (!expediente) {
      return NextResponse.json(
        { error: "Expediente no encontrado" },
        { status: 404 }
      );
    }

    if (expediente.estado !== "abierto") {
      return NextResponse.json(
        { error: "El expediente no está abierto" },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { argumentoId, contenido } = body;

    if (!argumentoId || !contenido) {
      return NextResponse.json(
        { error: "argumentoId y contenido son obligatorios" },
        { status: 400 }
      );
    }

    if (contenido.length > MAX_CHARS_COMENTARIO) {
      return NextResponse.json(
        { error: `Comentario: máximo ${MAX_CHARS_COMENTARIO} caracteres` },
        { status: 400 }
      );
    }

    // Verify argumento belongs to this expediente
    const argumento = await prisma.expedienteArgumento.findUnique({
      where: { id: argumentoId },
      select: { expedienteId: true, userId: true },
    });

    if (!argumento || argumento.expedienteId !== expedienteId) {
      return NextResponse.json(
        { error: "Argumento no encontrado en este expediente" },
        { status: 404 }
      );
    }

    const comentario = await prisma.expedienteComentario.create({
      data: {
        argumentoId,
        userId: authUser.id,
        contenido,
      },
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
    });

    // Notify argument author
    if (argumento.userId !== authUser.id) {
      await sendNotification({
        type: "NEW_CONTENT",
        title: "Nuevo comentario",
        body: `Han comentado tu argumento en "${expediente.titulo}"`,
        targetUserId: argumento.userId,
      });
    }

    return NextResponse.json({ comentario }, { status: 201 });
  } catch (error) {
    console.error("[POST /api/expediente/[id]/comentar]", error);
    return NextResponse.json(
      { error: "Error al comentar" },
      { status: 500 }
    );
  }
}
