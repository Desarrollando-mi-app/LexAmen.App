import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { awardXp } from "@/lib/xp-config";
import { evaluateBadges } from "@/lib/badges";
import { sendNotification } from "@/lib/notifications";
import {
  MAX_ARGUMENTOS_POR_BANDO,
  MAX_CONTRA_ARGUMENTOS,
  MIN_CHARS_ARGUMENTO,
  MAX_CHARS_ARGUMENTO,
  MAX_CHARS_POSICION,
  MAX_CHARS_FUNDAMENTO,
  XP_ARGUMENTO,
  XP_CONTRA_ARGUMENTO,
} from "@/lib/expediente-config";

// POST /api/expediente/[id]/argumentar
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
      select: { id: true, estado: true, titulo: true },
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
    const {
      bando,
      posicion,
      fundamentoNormativo,
      argumento,
      jurisprudencia,
      normativa,
      parentId,
    } = body;

    // ── Validations ──
    if (!bando || !posicion || !fundamentoNormativo || !argumento) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios" },
        { status: 400 }
      );
    }

    if (!["demandante", "demandado"].includes(bando)) {
      return NextResponse.json({ error: "Bando inválido" }, { status: 400 });
    }

    if (posicion.length > MAX_CHARS_POSICION) {
      return NextResponse.json(
        { error: `Posición: máximo ${MAX_CHARS_POSICION} caracteres` },
        { status: 400 }
      );
    }

    if (fundamentoNormativo.length > MAX_CHARS_FUNDAMENTO) {
      return NextResponse.json(
        { error: `Fundamento: máximo ${MAX_CHARS_FUNDAMENTO} caracteres` },
        { status: 400 }
      );
    }

    if (argumento.length < MIN_CHARS_ARGUMENTO) {
      return NextResponse.json(
        { error: `Argumento: mínimo ${MIN_CHARS_ARGUMENTO} caracteres` },
        { status: 400 }
      );
    }

    if (argumento.length > MAX_CHARS_ARGUMENTO) {
      return NextResponse.json(
        { error: `Argumento: máximo ${MAX_CHARS_ARGUMENTO} caracteres` },
        { status: 400 }
      );
    }

    const isContraArgumento = !!parentId;

    if (!isContraArgumento) {
      // Main argument: check max per bando per user
      const existingCount = await prisma.expedienteArgumento.count({
        where: {
          expedienteId,
          userId: authUser.id,
          bando,
          parentId: null,
        },
      });

      if (existingCount >= MAX_ARGUMENTOS_POR_BANDO) {
        return NextResponse.json(
          {
            error: `Ya tienes el máximo de ${MAX_ARGUMENTOS_POR_BANDO} argumento(s) para este bando`,
          },
          { status: 400 }
        );
      }
    } else {
      // Contra-argument: verify parent exists
      const parentArg = await prisma.expedienteArgumento.findUnique({
        where: { id: parentId },
        select: { expedienteId: true },
      });

      if (!parentArg || parentArg.expedienteId !== expedienteId) {
        return NextResponse.json(
          { error: "Argumento padre no encontrado en este expediente" },
          { status: 400 }
        );
      }

      // Check max contra-argumentos per user per expediente
      const contraCount = await prisma.expedienteArgumento.count({
        where: {
          expedienteId,
          userId: authUser.id,
          parentId: { not: null },
        },
      });

      if (contraCount >= MAX_CONTRA_ARGUMENTOS) {
        return NextResponse.json(
          {
            error: `Máximo ${MAX_CONTRA_ARGUMENTOS} contra-argumentos por expediente`,
          },
          { status: 400 }
        );
      }
    }

    // ── Create argumento ──
    const nuevoArgumento = await prisma.expedienteArgumento.create({
      data: {
        expedienteId,
        userId: authUser.id,
        bando,
        posicion,
        fundamentoNormativo,
        argumento,
        jurisprudencia: jurisprudencia || null,
        normativa: normativa || null,
        parentId: parentId || null,
      },
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
      },
    });

    // ── Award XP ──
    const xpAmount = isContraArgumento ? XP_CONTRA_ARGUMENTO : XP_ARGUMENTO;
    await awardXp({
      userId: authUser.id,
      amount: xpAmount,
      category: "publicaciones",
      prisma,
      detalle: isContraArgumento
        ? "Contra-argumento en Expediente Abierto"
        : "Argumento en Expediente Abierto",
    });

    // ── Evaluate badges ──
    const newBadges = await evaluateBadges(authUser.id, "diario");

    // ── Notify parent argument author (contra-argument) ──
    if (isContraArgumento && parentId) {
      const parentArg = await prisma.expedienteArgumento.findUnique({
        where: { id: parentId },
        select: { userId: true },
      });

      if (parentArg && parentArg.userId !== authUser.id) {
        await sendNotification({
          type: "NEW_CONTENT",
          title: "Nuevo contra-argumento",
          body: `Han respondido a tu argumento en "${expediente.titulo}"`,
          targetUserId: parentArg.userId,
        });
      }
    }

    return NextResponse.json(
      {
        argumento: nuevoArgumento,
        xp: xpAmount,
        newBadges,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[POST /api/expediente/[id]/argumentar]", error);
    return NextResponse.json(
      { error: "Error al crear argumento" },
      { status: 500 }
    );
  }
}
