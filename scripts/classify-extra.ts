/**
 * Extended classifier for titulos that seed-instituciones.ts doesn't map.
 * Handles descriptive names (CPC_JUICIO_ORDINARIO, COT_BASES, etc.)
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Extended map: descriptive titulos → institucionId
const EXTRA_MAP: Record<string, number> = {
  // ── CPC descriptivos ─────────────────────────
  CPC_JUICIO_ORDINARIO: 60,       // 60 = Juicio Ordinario
  CPC_JUICIOS_ESPECIALES: 65,     // 65 = Juicios Especiales
  CPC_ACTOS_NO_CONTENCIOSOS: 66,  // 66 = Actos No Contenciosos
  CPC_JUICIO_EJECUTIVO: 64,       // 64 = Juicio Ejecutivo
  CPC_NOTIFICACIONES: 56,
  CPC_RECURSOS: 63,

  // ── COT descriptivos ────────────────────────
  COT_BASES: 68,                      // Organización de Tribunales
  COT_REGLAS_GENERALES: 68,
  COT_JURISDICCION: 52,               // Jurisdicción
  COT_TRIBUNALES_ORDINARIOS: 68,
  COT_TRIBUNALES_ESPECIALES: 68,
  COT_TRIBUNALES_ARBITRALES: 68,
  COT_AUXILIARES_JUSTICIA: 69,        // Auxiliares de la Administración de Justicia
  COT_COMPETENCIA_ABSOLUTA: 53,       // Competencia
  COT_COMPETENCIA_RELATIVA: 53,
  COT_CONTIENDAS_COMPETENCIA: 53,
  COT_IMPLICANCIAS_RECUSACIONES: 70,  // Implicancias y Recusaciones
  // COT_INTEGRADOR_FINAL: intentionally skipped (integrative/review content)

  // ── Generic single-letter titulos ────────────
  TP: 1,  // Teoría de la Ley / La Ley

  // ── CPC_T# loose (normalizer didn't catch these) ──
  CPC_T1: 52,   // T1 → Competencia (Libro I)
  CPC_T2: 54,
  CPC_T3: 54,
  CPC_T5: 60,
  CPC_T6: 56,
  CPC_T7: 60,
  CPC_T8: 60,
  CPC_T9: 59,
  CPC_T11: 53,
  CPC_T12: 70,
  CPC_T13: 58,
  CPC_T14: 58,
  CPC_T16: 59,
  CPC_T17: 57,
  CPC_T18: 63,
};

async function classifyTitle(field: string, descr: string) {
  let total = 0;
  for (const [t, instId] of Object.entries(EXTRA_MAP)) {
    // Enum models (Flashcard, MCQ, TrueFalse use "titulo")
    if (field === "titulo") {
      const fc = await prisma.flashcard.updateMany({ where: { titulo: t, institucionId: null }, data: { institucionId: instId } });
      const mcq = await prisma.mCQ.updateMany({ where: { titulo: t, institucionId: null }, data: { institucionId: instId } });
      const vf = await prisma.trueFalse.updateMany({ where: { titulo: t, institucionId: null }, data: { institucionId: instId } });
      const def = await prisma.definicion.updateMany({ where: { titulo: t, institucionId: null }, data: { institucionId: instId } });
      const fb = await prisma.fillBlank.updateMany({ where: { titulo: t, institucionId: null }, data: { institucionId: instId } });
      const ei = await prisma.errorIdentification.updateMany({ where: { titulo: t, institucionId: null }, data: { institucionId: instId } });
      total += fc.count + mcq.count + vf.count + def.count + fb.count + ei.count;
    } else {
      // tituloMateria models
      const os = await prisma.orderSequence.updateMany({ where: { tituloMateria: t, institucionId: null }, data: { institucionId: instId } });
      const mc = await prisma.matchColumns.updateMany({ where: { tituloMateria: t, institucionId: null }, data: { institucionId: instId } });
      const cp = await prisma.casoPractico.updateMany({ where: { tituloMateria: t, institucionId: null }, data: { institucionId: instId } });
      const dj = await prisma.dictadoJuridico.updateMany({ where: { tituloMateria: t, institucionId: null }, data: { institucionId: instId } });
      const tl = await prisma.timeline.updateMany({ where: { tituloMateria: t, institucionId: null }, data: { institucionId: instId } });
      total += os.count + mc.count + cp.count + dj.count + tl.count;
    }
  }
  console.log(`  ${descr}: ${total} clasificados`);
  return total;
}

async function main() {
  console.log("═══ CLASSIFY EXTRA ═══\n");
  const a = await classifyTitle("titulo", "Enum/string models (titulo)");
  const b = await classifyTitle("tituloMateria", "TituloMateria models");
  console.log(`\n  TOTAL EXTRA CLASSIFIED: ${a + b}\n`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
