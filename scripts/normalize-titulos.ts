/**
 * Normalize titulo IDs in imported content to match the Índice Maestro.
 * Also fixes CPC libro values (LIBRO_I → LIBRO_I_CPC, etc.)
 * Usage: npx tsx scripts/normalize-titulos.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Roman numeral conversion ────────────────────────────

const ROMAN_MAP: Record<string, number> = {
  I: 1, II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
  XI: 11, XII: 12, XIII: 13, XIV: 14, XV: 15, XVI: 16, XVII: 17, XVIII: 18,
  XIX: 19, XX: 20, XXI: 21, XXII: 22, XXIII: 23, XXIV: 24, XXV: 25,
  XXVI: 26, XXVII: 27, XXVIII: 28, XXIX: 29, XXX: 30, XXXI: 31,
  XXXII: 32, XXXIII: 33, XXXIV: 34, XXXV: 35, XXXVI: 36, XXXVII: 37,
  XXXVIII: 38, XXXIX: 39, XL: 40, XLI: 41, XLII: 42,
};

function romanToArabic(roman: string): number | null {
  return ROMAN_MAP[roman] ?? null;
}

/** Extract the roman numeral from "TITULO_XIX" → "XIX" → 19 */
function extractTituloNumber(tituloId: string): number | null {
  const match = tituloId.match(/^TITULO_(.+)$/);
  if (!match) return null;
  return romanToArabic(match[1]);
}

// ─── Build mapping from Índice Maestro ───────────────────

// For each rama+libro, map arabic titulo number → real titulo ID
// e.g., DERECHO_CIVIL|TITULO_PRELIMINAR → { 1: "TP_1", 2: "TP_2", ... }
// We extract the number from the real ID (e.g., "TP_1" → 1, "LI_T10" → 10)

interface TituloMapping {
  byNumber: Map<number, string>; // arabic number → real ID
}

const mappings = new Map<string, TituloMapping>(); // "rama|libro" → mapping

for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  for (const seccion of rama.secciones) {
    const key = `${ramaKey}|${seccion.libro}`;
    const byNumber = new Map<number, string>();

    for (const titulo of seccion.titulos) {
      // Extract number from real ID
      // Patterns: TP_1, LI_T1, LII_T1, LIII_T1, LIV_T1, CPC_LI_T1, COT_T1
      const numMatch = titulo.id.match(/(\d+)$/);
      if (numMatch) {
        byNumber.set(parseInt(numMatch[1]), titulo.id);
      }
      // Special cases: TITULO_FINAL, COT_T6B, COT_TFINAL, etc.
      // These won't have a simple number — handle separately
    }

    mappings.set(key, { byNumber });
  }
}

// ─── CPC libro normalization ─────────────────────────────
// CPC content was imported with LIBRO_I, LIBRO_II, etc.
// but should be LIBRO_I_CPC, LIBRO_II_CPC, etc.

const CPC_LIBRO_MAP: Record<string, string> = {
  LIBRO_I: "LIBRO_I_CPC",
  LIBRO_II: "LIBRO_II_CPC",
  LIBRO_III: "LIBRO_III_CPC",
  LIBRO_IV: "LIBRO_IV_CPC",
};

// ─── Resolve titulo ID ──────────────────────────────────

function resolveTitulo(rama: string, libro: string, csvTitulo: string): string | null {
  // Normalize CPC libro first
  const normalizedLibro =
    rama === "DERECHO_PROCESAL_CIVIL" ? (CPC_LIBRO_MAP[libro] || libro) : libro;

  const key = `${rama}|${normalizedLibro}`;
  const mapping = mappings.get(key);
  if (!mapping) return null;

  // Handle special cases
  if (csvTitulo === "TITULO_FINAL") {
    // Look for TFINAL or similar
    const entries = Array.from(mapping.byNumber.values());
    const finalEntry = entries.find((id) => id.includes("FINAL"));
    return finalEntry ?? null;
  }

  // Handle "TITULO_IV_LIBRO_II" style (cross-references in CPC)
  const crossMatch = csvTitulo.match(/^TITULO_([IVXLC]+)_LIBRO_([IVXLC]+)$/);
  if (crossMatch) {
    // This is a titulo from a different libro referenced in current context
    // Use the titulo number from the cross-reference
    const num = romanToArabic(crossMatch[1]);
    if (num) return mapping.byNumber.get(num) ?? null;
  }

  // Standard case: TITULO_XIX → 19
  const num = extractTituloNumber(csvTitulo);
  if (num === null) return null;

  return mapping.byNumber.get(num) ?? null;
}

// ─── Update functions ────────────────────────────────────

const stats = { updated: 0, skipped: 0, notFound: 0, libroFixed: 0 };

async function updateEnumModel(
  modelName: string,
  findMany: () => Promise<{ id: string; rama: string; libro: string; titulo: string }[]>,
  update: (id: string, data: { libro?: string; titulo: string }) => Promise<void>
) {
  console.log(`\n── ${modelName} ──`);
  const rows = await findMany();
  let modelUpdated = 0;
  let modelSkipped = 0;
  let modelNotFound = 0;
  let modelLibroFixed = 0;

  for (const row of rows) {
    const newTitulo = resolveTitulo(row.rama, row.libro, row.titulo);
    const newLibro =
      row.rama === "DERECHO_PROCESAL_CIVIL" ? (CPC_LIBRO_MAP[row.libro] || row.libro) : row.libro;
    const needsLibroFix = newLibro !== row.libro;

    if (newTitulo && (newTitulo !== row.titulo || needsLibroFix)) {
      const updateData: { libro?: string; titulo: string } = { titulo: newTitulo };
      if (needsLibroFix) {
        updateData.libro = newLibro;
        modelLibroFixed++;
      }
      await update(row.id, updateData);
      modelUpdated++;
    } else if (!newTitulo && row.titulo.startsWith("TITULO_")) {
      modelNotFound++;
      if (modelNotFound <= 3) {
        console.log(`  ⚠ No mapping: ${row.rama}|${row.libro}|${row.titulo}`);
      }
    } else {
      modelSkipped++;
    }
  }

  console.log(
    `  ✅ ${modelUpdated} updated, ${modelSkipped} already correct, ${modelNotFound} not found` +
      (modelLibroFixed > 0 ? `, ${modelLibroFixed} libros fixed` : "")
  );
  stats.updated += modelUpdated;
  stats.skipped += modelSkipped;
  stats.notFound += modelNotFound;
  stats.libroFixed += modelLibroFixed;
}

async function updateStringModel(
  modelName: string,
  findMany: () => Promise<{ id: string; rama: string; libro: string | null; titulo: string | null }[]>,
  update: (id: string, data: { libro?: string; titulo: string }) => Promise<void>
) {
  console.log(`\n── ${modelName} ──`);
  const rows = await findMany();
  let modelUpdated = 0;
  let modelSkipped = 0;
  let modelNotFound = 0;
  let modelLibroFixed = 0;

  for (const row of rows) {
    if (!row.titulo || !row.libro) {
      modelSkipped++;
      continue;
    }
    const newTitulo = resolveTitulo(row.rama, row.libro, row.titulo);
    const newLibro =
      row.rama === "DERECHO_PROCESAL_CIVIL" ? (CPC_LIBRO_MAP[row.libro] || row.libro) : row.libro;
    const needsLibroFix = newLibro !== row.libro;

    if (newTitulo && (newTitulo !== row.titulo || needsLibroFix)) {
      const updateData: { libro?: string; titulo: string } = { titulo: newTitulo };
      if (needsLibroFix) {
        updateData.libro = newLibro;
        modelLibroFixed++;
      }
      await update(row.id, updateData);
      modelUpdated++;
    } else if (!newTitulo && row.titulo.startsWith("TITULO_")) {
      modelNotFound++;
      if (modelNotFound <= 3) {
        console.log(`  ⚠ No mapping: ${row.rama}|${row.libro}|${row.titulo}`);
      }
    } else {
      modelSkipped++;
    }
  }

  if (modelNotFound > 3) console.log(`  ... +${modelNotFound - 3} more not found`);
  console.log(
    `  ✅ ${modelUpdated} updated, ${modelSkipped} already correct, ${modelNotFound} not found` +
      (modelLibroFixed > 0 ? `, ${modelLibroFixed} libros fixed` : "")
  );
  stats.updated += modelUpdated;
  stats.skipped += modelSkipped;
  stats.notFound += modelNotFound;
  stats.libroFixed += modelLibroFixed;
}

// ─── tituloMateria models ────────────────────────────────

async function updateTituloMateriaModel(
  modelName: string,
  findMany: () => Promise<{ id: string; rama: string; libro: string | null; tituloMateria: string | null }[]>,
  update: (id: string, data: { libro?: string; tituloMateria: string }) => Promise<void>
) {
  console.log(`\n── ${modelName} ──`);
  const rows = await findMany();
  let modelUpdated = 0;
  let modelSkipped = 0;
  let modelNotFound = 0;
  let modelLibroFixed = 0;

  for (const row of rows) {
    if (!row.tituloMateria || !row.libro) {
      modelSkipped++;
      continue;
    }
    const newTitulo = resolveTitulo(row.rama, row.libro, row.tituloMateria);
    const newLibro =
      row.rama === "DERECHO_PROCESAL_CIVIL" ? (CPC_LIBRO_MAP[row.libro] || row.libro) : row.libro;
    const needsLibroFix = newLibro !== row.libro;

    if (newTitulo && (newTitulo !== row.tituloMateria || needsLibroFix)) {
      const updateData: { libro?: string; tituloMateria: string } = { tituloMateria: newTitulo };
      if (needsLibroFix) {
        updateData.libro = newLibro;
        modelLibroFixed++;
      }
      await update(row.id, updateData);
      modelUpdated++;
    } else if (!newTitulo && row.tituloMateria.startsWith("TITULO_")) {
      modelNotFound++;
      if (modelNotFound <= 3) {
        console.log(`  ⚠ No mapping: ${row.rama}|${row.libro}|${row.tituloMateria}`);
      }
    } else {
      modelSkipped++;
    }
  }

  if (modelNotFound > 3) console.log(`  ... +${modelNotFound - 3} more not found`);
  console.log(
    `  ✅ ${modelUpdated} updated, ${modelSkipped} already correct, ${modelNotFound} not found` +
      (modelLibroFixed > 0 ? `, ${modelLibroFixed} libros fixed` : "")
  );
  stats.updated += modelUpdated;
  stats.skipped += modelSkipped;
  stats.notFound += modelNotFound;
  stats.libroFixed += modelLibroFixed;
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  console.log("═══ NORMALIZE TITULO IDs ═══\n");
  console.log(`Mappings loaded: ${mappings.size} rama|libro combos`);

  // Enum models (Flashcard, MCQ, TrueFalse)
  const sel = { id: true, rama: true, libro: true, titulo: true } as const;

  await updateEnumModel(
    "Flashcard",
    () => prisma.flashcard.findMany({ select: sel }) as any,
    async (id, data) => { await prisma.flashcard.update({ where: { id }, data: data as any }); }
  );

  await updateEnumModel(
    "MCQ",
    () => prisma.mCQ.findMany({ select: sel }) as any,
    async (id, data) => { await prisma.mCQ.update({ where: { id }, data: data as any }); }
  );

  await updateEnumModel(
    "TrueFalse",
    () => prisma.trueFalse.findMany({ select: sel }) as any,
    async (id, data) => { await prisma.trueFalse.update({ where: { id }, data: data as any }); }
  );

  // String titulo models (Definicion, FillBlank, ErrorIdentification)
  await updateStringModel(
    "Definicion",
    () => prisma.definicion.findMany({ select: sel }),
    async (id, data) => { await prisma.definicion.update({ where: { id }, data }); }
  );

  await updateStringModel(
    "FillBlank",
    () => prisma.fillBlank.findMany({ select: sel }),
    async (id, data) => { await prisma.fillBlank.update({ where: { id }, data }); }
  );

  await updateStringModel(
    "ErrorIdentification",
    () => prisma.errorIdentification.findMany({ select: sel }),
    async (id, data) => { await prisma.errorIdentification.update({ where: { id }, data }); }
  );

  // tituloMateria models
  const selTM = { id: true, rama: true, libro: true, tituloMateria: true } as const;

  await updateTituloMateriaModel(
    "OrderSequence",
    () => prisma.orderSequence.findMany({ select: selTM }),
    async (id, data) => { await prisma.orderSequence.update({ where: { id }, data }); }
  );

  await updateTituloMateriaModel(
    "MatchColumns",
    () => prisma.matchColumns.findMany({ select: selTM }),
    async (id, data) => { await prisma.matchColumns.update({ where: { id }, data }); }
  );

  await updateTituloMateriaModel(
    "CasoPractico",
    () => prisma.casoPractico.findMany({ select: selTM }),
    async (id, data) => { await prisma.casoPractico.update({ where: { id }, data }); }
  );

  await updateTituloMateriaModel(
    "DictadoJuridico",
    () => prisma.dictadoJuridico.findMany({ select: selTM }),
    async (id, data) => { await prisma.dictadoJuridico.update({ where: { id }, data }); }
  );

  await updateTituloMateriaModel(
    "Timeline",
    () => prisma.timeline.findMany({ select: selTM }),
    async (id, data) => { await prisma.timeline.update({ where: { id }, data }); }
  );

  // Summary
  console.log("\n═══ SUMMARY ═══");
  console.log(`  Updated:    ${stats.updated}`);
  console.log(`  Skipped:    ${stats.skipped} (already correct or null)`);
  console.log(`  Not found:  ${stats.notFound} (no mapping available)`);
  console.log(`  Libros fixed: ${stats.libroFixed} (CPC LIBRO_I → LIBRO_I_CPC)`);
  console.log(`  Total rows: ${stats.updated + stats.skipped + stats.notFound}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
