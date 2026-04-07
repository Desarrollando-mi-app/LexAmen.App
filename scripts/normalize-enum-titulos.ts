/**
 * Normaliza títulos descriptivos (COT_COMPETENCIA_*, COT_TRIBUNALES_*, etc.)
 * en los modelos enum (Flashcard, MCQ, TrueFalse) que tienen libro=LIBRO_COT
 * pero titulo legacy.
 *
 * También normaliza los modelos string para los descriptive sources que faltaron.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// Mapping de títulos descriptivos a IDs canónicos
const TITULO_REMAP: Record<string, string> = {
  COT_JURISDICCION: "COT_T1",
  COT_TRIBUNALES_ORDINARIOS: "COT_T3",
  COT_TRIBUNALES_ESPECIALES: "COT_T2",
  COT_TRIBUNALES_ARBITRALES: "COT_T9",
  COT_AUXILIARES_JUSTICIA: "COT_T11",
  COT_COMPETENCIA_ABSOLUTA: "COT_T7",
  COT_COMPETENCIA_RELATIVA: "COT_T7",
  COT_CONTIENDAS_COMPETENCIA: "COT_T7",
  COT_IMPLICANCIAS_RECUSACIONES: "COT_T7",
  COT_BASES: "COT_T1",
  COT_REGLAS_GENERALES: "COT_T7",
  // Nota: COT_INTEGRADOR_FINAL se deja sin mapear (es contenido integrador)
};

async function main() {
  console.log("═══ NORMALIZE ENUM TÍTULOS ═══\n");
  let total = 0;

  for (const [oldT, newT] of Object.entries(TITULO_REMAP)) {
    const fc = await prisma.flashcard.updateMany({
      where: { titulo: oldT },
      data: { titulo: newT },
    });
    const mcq = await prisma.mCQ.updateMany({
      where: { titulo: oldT },
      data: { titulo: newT },
    });
    const vf = await prisma.trueFalse.updateMany({
      where: { titulo: oldT },
      data: { titulo: newT },
    });
    // Also string models that may not have been caught earlier
    const def = await prisma.definicion.updateMany({
      where: { titulo: oldT },
      data: { titulo: newT },
    });
    const fb = await prisma.fillBlank.updateMany({
      where: { titulo: oldT },
      data: { titulo: newT },
    });
    const ei = await prisma.errorIdentification.updateMany({
      where: { titulo: oldT },
      data: { titulo: newT },
    });
    const sub = fc.count + mcq.count + vf.count + def.count + fb.count + ei.count;
    if (sub > 0) {
      console.log(`  ${oldT} → ${newT}: FC=${fc.count} MCQ=${mcq.count} VF=${vf.count} DEF=${def.count} FB=${fb.count} EI=${ei.count}  TOTAL=${sub}`);
      total += sub;
    }
  }

  console.log(`\n  TOTAL UPDATED: ${total}`);
  await prisma.$disconnect();
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
