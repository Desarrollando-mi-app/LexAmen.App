import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { prisma } from "@/lib/prisma";
import { isValidExerciseType, TYPE_TO_PRISMA_MODEL, type ExerciseType } from "@/lib/exercise-codes";

// Whitelist of fields editable per exercise type.
// This protects against arbitrary writes via the admin API.
const EDITABLE_FIELDS: Record<ExerciseType, string[]> = {
  FLASHCARD: ["front", "back", "rama", "libro", "titulo", "dificultad", "articuloRef"],
  MCQ: ["question", "optionA", "optionB", "optionC", "optionD", "correctOption", "explanation", "rama", "libro", "titulo", "dificultad", "articuloRef"],
  TRUEFALSE: ["statement", "isTrue", "explanation", "rama", "libro", "titulo", "dificultad", "articuloRef"],
  DEFINICION: ["concepto", "definicion", "rama", "libro", "titulo", "distractor1", "distractor2", "distractor3", "explicacion", "articuloRef"],
  FILLBLANK: ["textoConBlancos", "blancos", "explicacion", "rama", "libro", "titulo", "dificultad"],
  ERROR_IDENTIFICATION: ["textoConErrores", "segmentos", "totalErrores", "explicacionGeneral", "rama", "libro", "titulo", "dificultad"],
  ORDER_SEQUENCE: ["titulo", "instruccion", "items", "explicacion", "rama", "libro", "tituloMateria", "dificultad"],
  MATCH_COLUMNS: ["titulo", "columnaIzqLabel", "columnaDerLabel", "pares", "explicacion", "rama", "libro", "tituloMateria", "dificultad"],
  CASO_PRACTICO: ["titulo", "hechos", "preguntas", "resumenFinal", "rama", "libro", "tituloMateria", "dificultad"],
  DICTADO: ["titulo", "textoCompleto", "rama", "libro", "tituloMateria", "dificultad"],
  TIMELINE: ["titulo", "instruccion", "eventos", "escala", "rangoMin", "rangoMax", "explicacion", "rama", "libro", "tituloMateria", "dificultad"],
};

async function checkAdmin() {
  const supabase = await createClient();
  const { data: { user: authUser } } = await supabase.auth.getUser();
  if (!authUser) return { error: "No autenticado", status: 401, userId: null };
  const admin = await prisma.user.findUnique({
    where: { id: authUser.id },
    select: { isAdmin: true },
  });
  if (!admin?.isAdmin) return { error: "No autorizado", status: 403, userId: null };
  return { error: null, status: 200, userId: authUser.id };
}

export async function GET(_req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { error, status } = await checkAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { type, id } = await params;
  if (!isValidExerciseType(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }
  const modelKey = TYPE_TO_PRISMA_MODEL[type];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[modelKey];
  const record = await delegate.findUnique({ where: { id } });
  if (!record) return NextResponse.json({ error: "No encontrado" }, { status: 404 });
  return NextResponse.json({ record });
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ type: string; id: string }> }) {
  const { error, status, userId } = await checkAdmin();
  if (error) return NextResponse.json({ error }, { status });

  const { type, id } = await params;
  if (!isValidExerciseType(type)) {
    return NextResponse.json({ error: "Tipo inválido" }, { status: 400 });
  }

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Body inválido" }, { status: 400 });
  }

  const allowed = EDITABLE_FIELDS[type];
  const updateData: Record<string, unknown> = {};
  for (const key of Object.keys(body)) {
    if (allowed.includes(key)) updateData[key] = body[key];
  }
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: "Sin campos editables válidos" }, { status: 400 });
  }

  const modelKey = TYPE_TO_PRISMA_MODEL[type];
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const delegate = (prisma as any)[modelKey];
  try {
    const updated = await delegate.update({ where: { id }, data: updateData });
    await prisma.adminLog.create({
      data: {
        adminId: userId!,
        action: "EXERCISE_EDIT",
        target: id,
        metadata: { type, fields: Object.keys(updateData) },
      },
    });
    return NextResponse.json({ ok: true, record: updated });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
