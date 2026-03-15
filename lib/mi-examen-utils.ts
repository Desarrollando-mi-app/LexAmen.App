/**
 * Mi Examen — Utilidades de mapeo de contenido y cálculo de progreso
 *
 * Mapea temas del cedulario al contenido disponible en Studio Iuris
 * y calcula el progreso del usuario por tema.
 */

import { prisma } from "@/lib/prisma";
import { CURRICULUM, RAMA_LABELS } from "@/lib/curriculum-data";

// ─── Types ─────────────────────────────────────────────────

export interface MateriaDisponible {
  rama: string;
  ramaLabel: string;
  libro: string;
  libroLabel: string;
  flashcards: number;
  mcq: number;
  vf: number;
  total: number;
}

export interface TemaProgress {
  flashcardsDominadas: number;
  flashcardsTotal: number;
  mcqCorrectas: number;
  mcqTotal: number;
  vfCorrectas: number;
  vfTotal: number;
  porcentaje: number;
}

export interface StudySuggestion {
  temaNombre: string;
  temaId: string;
  tipo: "flashcards" | "mcq" | "vf";
  cantidad: number;
  razon: string;
}

interface ExamenTemaLike {
  id: string;
  nombre: string;
  materiaMapping: string | null;
  libroMapping: string | null;
  porcentajeAvance: number;
  tieneContenido: boolean;
  peso: number;
  flashcardsDisponibles: number;
  mcqDisponibles: number;
  vfDisponibles: number;
  flashcardsDominadas: number;
  mcqCorrectas: number;
  vfCorrectas: number;
}

// ─── Materias disponibles ──────────────────────────────────

/**
 * Retorna la lista de materias/ramas con contenido disponible en Studio Iuris
 * Agrupadas por rama + libro con conteos
 */
export async function getAvailableMaterias(): Promise<MateriaDisponible[]> {
  const [flashcardsByRamaLibro, mcqsByRamaLibro, vfByRamaLibro] =
    await Promise.all([
      prisma.flashcard.groupBy({
        by: ["rama", "libro"],
        _count: { id: true },
      }),
      prisma.mCQ.groupBy({
        by: ["rama", "libro"],
        _count: { id: true },
      }),
      prisma.trueFalse.groupBy({
        by: ["rama", "libro"],
        _count: { id: true },
      }),
    ]);

  // Merge into a map by rama+libro
  const map = new Map<string, MateriaDisponible>();

  for (const item of flashcardsByRamaLibro) {
    const key = `${item.rama}:${item.libro}`;
    const existing = map.get(key);
    if (existing) {
      existing.flashcards = item._count.id;
      existing.total += item._count.id;
    } else {
      map.set(key, {
        rama: item.rama,
        ramaLabel: RAMA_LABELS[item.rama] ?? item.rama,
        libro: item.libro,
        libroLabel: getLibroLabel(item.rama, item.libro),
        flashcards: item._count.id,
        mcq: 0,
        vf: 0,
        total: item._count.id,
      });
    }
  }

  for (const item of mcqsByRamaLibro) {
    const key = `${item.rama}:${item.libro}`;
    const existing = map.get(key);
    if (existing) {
      existing.mcq = item._count.id;
      existing.total += item._count.id;
    } else {
      map.set(key, {
        rama: item.rama,
        ramaLabel: RAMA_LABELS[item.rama] ?? item.rama,
        libro: item.libro,
        libroLabel: getLibroLabel(item.rama, item.libro),
        flashcards: 0,
        mcq: item._count.id,
        vf: 0,
        total: item._count.id,
      });
    }
  }

  for (const item of vfByRamaLibro) {
    const key = `${item.rama}:${item.libro}`;
    const existing = map.get(key);
    if (existing) {
      existing.vf = item._count.id;
      existing.total += item._count.id;
    } else {
      map.set(key, {
        rama: item.rama,
        ramaLabel: RAMA_LABELS[item.rama] ?? item.rama,
        libro: item.libro,
        libroLabel: getLibroLabel(item.rama, item.libro),
        flashcards: 0,
        mcq: 0,
        vf: item._count.id,
        total: item._count.id,
      });
    }
  }

  return Array.from(map.values()).sort((a, b) => {
    if (a.rama !== b.rama) return a.rama.localeCompare(b.rama);
    return a.libro.localeCompare(b.libro);
  });
}

/**
 * Retorna la lista de materias simplificada para el prompt de Claude API
 * Formato: "RAMA | LIBRO | flashcards: N, mcq: N, vf: N"
 */
export async function getMateriasForPrompt(): Promise<string> {
  const materias = await getAvailableMaterias();
  const lines = materias.map(
    (m) =>
      `- ${m.ramaLabel} > ${m.libroLabel} [rama=${m.rama}, libro=${m.libro}] — flashcards: ${m.flashcards}, mcq: ${m.mcq}, v/f: ${m.vf}`
  );
  return lines.join("\n");
}

// ─── Progreso por tema ─────────────────────────────────────

/**
 * Calcula el progreso del usuario en una materia específica
 * Usa rama + libro (y opcionalmente titulo) para filtrar
 */
export async function calculateTemaProgress(
  userId: string,
  rama: string,
  libro?: string | null,
  titulo?: string | null
): Promise<TemaProgress> {
  // Build where clauses
  const flashcardWhere: Record<string, unknown> = { rama: rama as never };
  const mcqWhere: Record<string, unknown> = { rama: rama as never };
  const vfWhere: Record<string, unknown> = { rama: rama as never };

  if (libro) {
    flashcardWhere.libro = libro as never;
    mcqWhere.libro = libro as never;
    vfWhere.libro = libro as never;
  }

  if (titulo) {
    flashcardWhere.titulo = titulo;
    mcqWhere.titulo = titulo;
    vfWhere.titulo = titulo;
  }

  const [
    flashcardsTotal,
    flashcardsDominadas,
    mcqTotal,
    mcqCorrectas,
    vfTotal,
    vfCorrectas,
  ] = await Promise.all([
    // Flashcards total in this materia
    prisma.flashcard.count({ where: flashcardWhere }),
    // Flashcards dominated (repetitions >= 3)
    prisma.userFlashcardProgress.count({
      where: {
        userId,
        repetitions: { gte: 3 },
        flashcard: flashcardWhere,
      },
    }),
    // MCQ total
    prisma.mCQ.count({ where: mcqWhere }),
    // MCQ correct (unique, most recent attempt correct)
    prisma.userMCQAttempt.count({
      where: {
        userId,
        isCorrect: true,
        mcq: mcqWhere,
      },
    }),
    // V/F total
    prisma.trueFalse.count({ where: vfWhere }),
    // V/F correct
    prisma.userTrueFalseAttempt.count({
      where: {
        userId,
        isCorrect: true,
        trueFalse: vfWhere,
      },
    }),
  ]);

  // Weighted percentage: flashcards 50%, MCQ 30%, V/F 20%
  let porcentaje = 0;
  let weightSum = 0;

  if (flashcardsTotal > 0) {
    porcentaje += (flashcardsDominadas / flashcardsTotal) * 50;
    weightSum += 50;
  }
  if (mcqTotal > 0) {
    porcentaje += (Math.min(mcqCorrectas, mcqTotal) / mcqTotal) * 30;
    weightSum += 30;
  }
  if (vfTotal > 0) {
    porcentaje += (Math.min(vfCorrectas, vfTotal) / vfTotal) * 20;
    weightSum += 20;
  }

  // Normalize to 0-100 based on available content types
  if (weightSum > 0) {
    porcentaje = (porcentaje / weightSum) * 100;
  }

  return {
    flashcardsDominadas,
    flashcardsTotal,
    mcqCorrectas: Math.min(mcqCorrectas, mcqTotal),
    mcqTotal,
    vfCorrectas: Math.min(vfCorrectas, vfTotal),
    vfTotal,
    porcentaje: Math.round(porcentaje * 10) / 10, // 1 decimal
  };
}

// ─── Conteo de contenido disponible ────────────────────────

/**
 * Cuenta flashcards, MCQ y V/F disponibles para una rama+libro(+titulo)
 */
export async function countContentForMapping(
  rama: string,
  libro?: string | null,
  titulo?: string | null
): Promise<{ flashcards: number; mcq: number; vf: number }> {
  const where: Record<string, unknown> = { rama: rama as never };
  if (libro) where.libro = libro as never;
  if (titulo) where.titulo = titulo;

  const [flashcards, mcq, vf] = await Promise.all([
    prisma.flashcard.count({ where }),
    prisma.mCQ.count({ where }),
    prisma.trueFalse.count({ where }),
  ]);

  return { flashcards, mcq, vf };
}

// ─── Sugerencia de estudio ─────────────────────────────────

/**
 * Genera una sugerencia inteligente de estudio basada en los temas del cedulario
 */
export function generateStudySuggestion(
  temas: ExamenTemaLike[],
  diasRestantes: number | null
): StudySuggestion | null {
  // Filtrar temas con contenido
  const temasConContenido = temas.filter((t) => t.tieneContenido);
  if (temasConContenido.length === 0) return null;

  // Ordenar por porcentajeAvance ASC (los más débiles primero), con peso como tiebreaker
  const sorted = [...temasConContenido].sort((a, b) => {
    const diff = a.porcentajeAvance - b.porcentajeAvance;
    if (Math.abs(diff) < 1) return b.peso - a.peso; // Mayor peso = más prioridad
    return diff;
  });

  const tema = sorted[0];

  // Determinar tipo: el que tiene más disponible y menos practicado
  const flashcardGap = tema.flashcardsDisponibles - tema.flashcardsDominadas;
  const mcqGap = tema.mcqDisponibles - tema.mcqCorrectas;
  const vfGap = tema.vfDisponibles - tema.vfCorrectas;

  let tipo: "flashcards" | "mcq" | "vf" = "flashcards";
  let maxGap = flashcardGap;

  if (mcqGap > maxGap) {
    tipo = "mcq";
    maxGap = mcqGap;
  }
  if (vfGap > maxGap) {
    tipo = "vf";
  }

  // Cantidad según urgencia
  let cantidad: number;
  if (diasRestantes !== null && diasRestantes < 15) {
    cantidad = tipo === "flashcards" ? 20 : tipo === "mcq" ? 10 : 10;
  } else if (diasRestantes !== null && diasRestantes <= 30) {
    cantidad = tipo === "flashcards" ? 15 : tipo === "mcq" ? 8 : 8;
  } else {
    cantidad = tipo === "flashcards" ? 10 : tipo === "mcq" ? 5 : 5;
  }

  // No sugerir más de lo disponible
  const disponible =
    tipo === "flashcards"
      ? flashcardGap
      : tipo === "mcq"
        ? mcqGap
        : vfGap;
  cantidad = Math.min(cantidad, Math.max(disponible, 1));

  const tipoLabel =
    tipo === "flashcards" ? "flashcards" : tipo === "mcq" ? "preguntas MCQ" : "verdadero/falso";

  const urgencia =
    diasRestantes !== null && diasRestantes < 15
      ? " y tu examen está cerca"
      : "";

  return {
    temaNombre: tema.nombre,
    temaId: tema.id,
    tipo,
    cantidad,
    razon: `${tema.nombre} es tu área más débil (${Math.round(tema.porcentajeAvance)}% avance)${urgencia}. Practica ${cantidad} ${tipoLabel}.`,
  };
}

// ─── Helpers internos ──────────────────────────────────────

function getLibroLabel(rama: string, libro: string): string {
  const ramaNode = CURRICULUM[rama];
  if (!ramaNode) return libro;
  const seccion = ramaNode.secciones.find((s) => s.libro === libro);
  return seccion?.label ?? libro;
}
