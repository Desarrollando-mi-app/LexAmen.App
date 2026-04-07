/**
 * Normalize orphaned títulos.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const COT_DESCRIPTIVE: Record<string, string> = {
  COT_JURISDICCION: "COT_T1",
  COT_TRIBUNALES_ORDINARIOS: "COT_T3",
  COT_TRIBUNALES_ESPECIALES: "COT_T2",
  COT_COMPETENCIA_ABSOLUTA: "COT_T7",
  COT_COMPETENCIA_RELATIVA: "COT_T7",
  COT_CONTIENDAS_COMPETENCIA: "COT_T7",
  COT_IMPLICANCIAS_RECUSACIONES: "COT_T7",
};

const COT_ROMAN: Record<string, string> = {
  TITULO_I: "COT_T1", TITULO_II: "COT_T2", TITULO_III: "COT_T3",
  TITULO_IV: "COT_T4", TITULO_V: "COT_T5", TITULO_VI: "COT_T6",
  TITULO_VII: "COT_T7", TITULO_VIII: "COT_T8", TITULO_IX: "COT_T9",
  TITULO_X: "COT_T10", TITULO_XI: "COT_T11", TITULO_XII: "COT_T12",
  TITULO_XIII: "COT_T13", TITULO_XIV: "COT_T14", TITULO_XV: "COT_T15",
  TITULO_XVI: "COT_T16", TITULO_XVII: "COT_T17",
};

async function main() {
  console.log("═══ NORMALIZING ORPHAN TÍTULOS ═══\n");
  let totalUpdated = 0;

  // ───── String-field models (libro + tituloMateria or titulo) ─────
  const stringModels: Array<{ name: string; tituloField: string; call: (w: any, d: any) => Promise<{ count: number }> }> = [
    { name: "Definicion", tituloField: "titulo", call: (w, d) => prisma.definicion.updateMany({ where: w, data: d }) },
    { name: "FillBlank", tituloField: "titulo", call: (w, d) => prisma.fillBlank.updateMany({ where: w, data: d }) },
    { name: "ErrorIdentification", tituloField: "titulo", call: (w, d) => prisma.errorIdentification.updateMany({ where: w, data: d }) },
    { name: "OrderSequence", tituloField: "tituloMateria", call: (w, d) => prisma.orderSequence.updateMany({ where: w, data: d }) },
    { name: "MatchColumns", tituloField: "tituloMateria", call: (w, d) => prisma.matchColumns.updateMany({ where: w, data: d }) },
    { name: "CasoPractico", tituloField: "tituloMateria", call: (w, d) => prisma.casoPractico.updateMany({ where: w, data: d }) },
    { name: "DictadoJuridico", tituloField: "tituloMateria", call: (w, d) => prisma.dictadoJuridico.updateMany({ where: w, data: d }) },
    { name: "Timeline", tituloField: "tituloMateria", call: (w, d) => prisma.timeline.updateMany({ where: w, data: d }) },
  ];

  for (const m of stringModels) {
    // COT descriptive + COT roman (only for libro="COT" — string field)
    for (const [oldT, newT] of Object.entries({ ...COT_DESCRIPTIVE, ...COT_ROMAN })) {
      const r = await m.call({ libro: "COT", [m.tituloField]: oldT }, { libro: "LIBRO_COT", [m.tituloField]: newT });
      if (r.count > 0) {
        console.log(`  ${m.name}: COT|${oldT} → LIBRO_COT|${newT} (${r.count})`);
        totalUpdated += r.count;
      }
    }
    // CODIGO_CIVIL|TITULO_PRELIMINAR → TITULO_PRELIMINAR|TP_3
    const r = await m.call(
      { libro: "CODIGO_CIVIL", [m.tituloField]: "TITULO_PRELIMINAR" },
      { libro: "TITULO_PRELIMINAR", [m.tituloField]: "TP_3" }
    );
    if (r.count > 0) {
      console.log(`  ${m.name}: CODIGO_CIVIL|TITULO_PRELIMINAR → TITULO_PRELIMINAR|TP_3 (${r.count})`);
      totalUpdated += r.count;
    }
  }

  // ───── Enum-field models (Flashcard, MCQ, TrueFalse) ─────
  // Only CODIGO_CIVIL|TITULO_PRELIMINAR applies
  const enumUpdates: Array<[string, (w: any, d: any) => Promise<{ count: number }>]> = [
    ["Flashcard", (w, d) => prisma.flashcard.updateMany({ where: w, data: d })],
    ["MCQ", (w, d) => prisma.mCQ.updateMany({ where: w, data: d })],
    ["TrueFalse", (w, d) => prisma.trueFalse.updateMany({ where: w, data: d })],
  ];
  for (const [name, fn] of enumUpdates) {
    const r = await fn(
      { libro: "CODIGO_CIVIL" as any, titulo: "TITULO_PRELIMINAR" },
      { libro: "TITULO_PRELIMINAR" as any, titulo: "TP_3" }
    );
    if (r.count > 0) {
      console.log(`  ${name}: CODIGO_CIVIL|TITULO_PRELIMINAR → TITULO_PRELIMINAR|TP_3 (${r.count})`);
      totalUpdated += r.count;
    }
  }

  console.log(`\n  TOTAL UPDATED: ${totalUpdated}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
