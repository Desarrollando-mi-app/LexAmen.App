/**
 * Verify imported content against the Índice Maestro (curriculum-data.ts)
 * Usage: npx tsx scripts/verify-content.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── Build valid combos from Índice Maestro ──────────────

const validRamas = new Set(Object.keys(CURRICULUM));
const validLibros = new Set<string>();
const validTitulos = new Set<string>(); // titulo IDs
const validCombos = new Set<string>(); // "RAMA|LIBRO|TITULO"

for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  for (const seccion of rama.secciones) {
    validLibros.add(seccion.libro);
    for (const titulo of seccion.titulos) {
      validTitulos.add(titulo.id);
      validCombos.add(`${ramaKey}|${seccion.libro}|${titulo.id}`);
    }
  }
}

console.log("═══ ÍNDICE MAESTRO ═══");
console.log(`  Ramas: ${validRamas.size} → ${[...validRamas].join(", ")}`);
console.log(`  Libros: ${validLibros.size}`);
console.log(`  Títulos: ${validTitulos.size}`);
console.log(`  Combinaciones válidas: ${validCombos.size}`);

// ─── Models to check ─────────────────────────────────────

interface ContentRow {
  rama: string;
  libro: string | null;
  titulo: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any;
}

interface Issue {
  model: string;
  type: string;
  detail: string;
  count?: number;
}

const issues: Issue[] = [];
let totalRows = 0;
let totalCombos = 0;
const allCombos = new Set<string>();

async function checkModel(
  name: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fetcher: () => Promise<any[]>,
  hasLibroEnum: boolean
) {
  try {
    const rows: ContentRow[] = await fetcher();
    console.log(`\n── ${name.toUpperCase()} (${rows.length} rows) ──`);
    totalRows += rows.length;

    // Check for empty fields
    const emptyRama = rows.filter((r) => !r.rama);
    const emptyLibro = rows.filter((r) => !r.libro && r.libro !== null);
    const emptyTitulo = rows.filter((r) => !r.titulo && r.titulo !== null);

    if (emptyRama.length > 0) {
      issues.push({ model: name, type: "EMPTY_RAMA", detail: `${emptyRama.length} rows with empty rama`, count: emptyRama.length });
      console.log(`  ⚠ ${emptyRama.length} rows with EMPTY rama`);
    }

    // Get unique combos
    const combos = new Map<string, number>();
    for (const r of rows) {
      const key = `${r.rama}|${r.libro || ""}|${r.titulo || ""}`;
      combos.set(key, (combos.get(key) || 0) + 1);
      allCombos.add(key);
    }

    totalCombos += combos.size;

    // Check invalid ramas
    const invalidRamas = [...combos.keys()]
      .map((k) => k.split("|")[0])
      .filter((r) => r && !validRamas.has(r));
    if (invalidRamas.length > 0) {
      const unique = [...new Set(invalidRamas)];
      issues.push({ model: name, type: "INVALID_RAMA", detail: unique.join(", ") });
      console.log(`  ❌ Invalid ramas: ${unique.join(", ")}`);
    }

    // Check invalid libros (only for enum models)
    if (hasLibroEnum) {
      const invalidLibros = [...combos.keys()]
        .map((k) => k.split("|")[1])
        .filter((l) => l && !validLibros.has(l));
      if (invalidLibros.length > 0) {
        const unique = [...new Set(invalidLibros)];
        issues.push({ model: name, type: "INVALID_LIBRO", detail: unique.join(", ") });
        console.log(`  ❌ Invalid libros: ${unique.join(", ")}`);
      }
    }

    // Check combos against curriculum
    let matched = 0;
    let unmatched = 0;
    const unmatchedList: string[] = [];
    for (const [combo, count] of combos) {
      const [rama, libro, titulo] = combo.split("|");
      if (!titulo || !libro) {
        // Non-enum models may have null libro/titulo — skip combo check
        continue;
      }
      if (validCombos.has(combo)) {
        matched++;
      } else {
        unmatched++;
        unmatchedList.push(`${combo} (${count} rows)`);
      }
    }

    if (unmatchedList.length > 0) {
      console.log(`  ⚠ ${unmatched} combos NOT in Índice Maestro:`);
      for (const u of unmatchedList.slice(0, 10)) {
        console.log(`    → ${u}`);
      }
      if (unmatchedList.length > 10) console.log(`    ... +${unmatchedList.length - 10} more`);
      issues.push({ model: name, type: "UNMATCHED_COMBO", detail: `${unmatched} combos not in curriculum`, count: unmatched });
    } else if (matched > 0) {
      console.log(`  ✅ All ${matched} combos match Índice Maestro`);
    }

    // Show combo summary
    console.log(`  Combos: ${combos.size} unique`);
    for (const [combo, count] of [...combos.entries()].sort()) {
      console.log(`    ${combo} → ${count} rows`);
    }
  } catch (e: any) {
    console.log(`\n── ${name.toUpperCase()} ── ERROR: ${e.message?.substring(0, 100)}`);
    issues.push({ model: name, type: "QUERY_ERROR", detail: e.message?.substring(0, 100) });
  }
}

// ─── Cross-classification checks ─────────────────────────

async function checkCrossClassification() {
  console.log("\n═══ CROSS-CLASSIFICATION CHECKS ═══");

  // MCQ: rama DERECHO_CIVIL but question mentions "CPC" or "jurisdicción"
  const mcqCross = await prisma.mCQ.findMany({
    where: {
      rama: "DERECHO_CIVIL",
      OR: [
        { question: { contains: "CPC", mode: "insensitive" } },
        { question: { contains: "Código de Procedimiento", mode: "insensitive" } },
      ],
    },
    select: { id: true, question: true, libro: true, titulo: true },
  });
  if (mcqCross.length > 0) {
    console.log(`\n  ⚠ ${mcqCross.length} MCQs classified as CIVIL but mention CPC:`);
    for (const m of mcqCross.slice(0, 5)) {
      console.log(`    → [${m.libro}/${m.titulo}] ${m.question.substring(0, 80)}...`);
    }
    issues.push({ model: "mcq", type: "CROSS_CLASSIFICATION", detail: `${mcqCross.length} CIVIL MCQs mention CPC`, count: mcqCross.length });
  } else {
    console.log("  ✅ No MCQs classified as CIVIL that mention CPC");
  }

  // Flashcards: DERECHO_CIVIL but mentions "COT" or "competencia absoluta"
  const fcCross = await prisma.flashcard.findMany({
    where: {
      rama: "DERECHO_CIVIL",
      OR: [
        { front: { contains: "COT", mode: "insensitive" } },
        { front: { contains: "Código Orgánico", mode: "insensitive" } },
      ],
    },
    select: { id: true, front: true, libro: true, titulo: true },
  });
  if (fcCross.length > 0) {
    console.log(`\n  ⚠ ${fcCross.length} Flashcards classified as CIVIL but mention COT:`);
    for (const f of fcCross.slice(0, 5)) {
      console.log(`    → [${f.libro}/${f.titulo}] ${f.front.substring(0, 80)}...`);
    }
    issues.push({ model: "flashcard", type: "CROSS_CLASSIFICATION", detail: `${fcCross.length} CIVIL flashcards mention COT`, count: fcCross.length });
  } else {
    console.log("  ✅ No Flashcards classified as CIVIL that mention COT");
  }

  // VF: PROCESAL but mentions "Código Civil" (not "Código de Procedimiento Civil")
  const vfCross = await prisma.trueFalse.findMany({
    where: {
      rama: "DERECHO_PROCESAL_CIVIL",
      statement: { contains: "Código Civil", mode: "insensitive" },
      NOT: { statement: { contains: "Procedimiento", mode: "insensitive" } },
    },
    select: { id: true, statement: true, libro: true, titulo: true },
  });
  if (vfCross.length > 0) {
    console.log(`\n  ⚠ ${vfCross.length} V/F classified as PROCESAL but mention "Código Civil":`);
    for (const v of vfCross.slice(0, 5)) {
      console.log(`    → [${v.libro}/${v.titulo}] ${v.statement.substring(0, 80)}...`);
    }
    // Note: this may be legitimate (Procesal questions can reference CC articles)
    // So log as INFO, not ERROR
    console.log("    ℹ This may be legitimate — Procesal questions often reference CC articles");
  } else {
    console.log("  ✅ No V/F classified as PROCESAL that mention 'Código Civil' without 'Procedimiento'");
  }

  // Null/empty checks across all enum models
  const nullFlashcards = await prisma.flashcard.count({ where: { titulo: "" } });
  const nullMcq = await prisma.mCQ.count({ where: { titulo: "" } });
  const nullVf = await prisma.trueFalse.count({ where: { titulo: "" } });

  if (nullFlashcards + nullMcq + nullVf > 0) {
    console.log(`\n  ⚠ Empty titulo fields: Flashcards=${nullFlashcards}, MCQ=${nullMcq}, V/F=${nullVf}`);
    issues.push({ model: "enum_models", type: "EMPTY_TITULO", detail: `${nullFlashcards + nullMcq + nullVf} rows with empty titulo` });
  } else {
    console.log("  ✅ No empty titulo fields in Flashcard/MCQ/TrueFalse");
  }
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  // Enum models (rama/libro/titulo are enum or required string)
  const selectEnum = { rama: true, libro: true, titulo: true } as const;
  await checkModel("flashcard", () => prisma.flashcard.findMany({ select: selectEnum }), true);
  await checkModel("mcq", () => prisma.mCQ.findMany({ select: selectEnum }), true);
  await checkModel("trueFalse", () => prisma.trueFalse.findMany({ select: selectEnum }), true);

  // String models (rama/libro/titulo are optional strings)
  const selectStr = { rama: true, libro: true, titulo: true } as const;
  await checkModel("definicion", () => prisma.definicion.findMany({ select: selectStr }), false);
  await checkModel("fillBlank", () => prisma.fillBlank.findMany({ select: selectStr }), false);
  await checkModel("errorIdentification", () => prisma.errorIdentification.findMany({ select: selectStr }), false);

  // Models with tituloMateria instead of titulo
  const selectTM = { rama: true, libro: true, tituloMateria: true } as const;
  await checkModel("orderSequence", () => prisma.orderSequence.findMany({ select: selectTM }).then(rows => rows.map(r => ({ rama: r.rama, libro: r.libro, titulo: r.tituloMateria }))), false);
  await checkModel("matchColumns", () => prisma.matchColumns.findMany({ select: selectTM }).then(rows => rows.map(r => ({ rama: r.rama, libro: r.libro, titulo: r.tituloMateria }))), false);
  await checkModel("casoPractico", () => prisma.casoPractico.findMany({ select: selectTM }).then(rows => rows.map(r => ({ rama: r.rama, libro: r.libro, titulo: r.tituloMateria }))), false);
  await checkModel("dictadoJuridico", () => prisma.dictadoJuridico.findMany({ select: selectTM }).then(rows => rows.map(r => ({ rama: r.rama, libro: r.libro, titulo: r.tituloMateria }))), false);
  await checkModel("timeline", () => prisma.timeline.findMany({ select: selectTM }).then(rows => rows.map(r => ({ rama: r.rama, libro: r.libro, titulo: r.tituloMateria }))), false);

  // Cross-classification checks
  await checkCrossClassification();

  // ─── Final Report ──────────────────────────────────────
  console.log("\n\n╔════════════════════════════════════════════╗");
  console.log("║          VERIFICATION REPORT               ║");
  console.log("╚════════════════════════════════════════════╝\n");

  console.log(`  Total rows verified:     ${totalRows.toLocaleString()}`);
  console.log(`  Unique combos found:     ${allCombos.size}`);
  console.log(`  Índice Maestro combos:   ${validCombos.size}`);

  const criticalIssues = issues.filter((i) => i.type === "INVALID_RAMA" || i.type === "INVALID_LIBRO" || i.type === "QUERY_ERROR");
  const warnings = issues.filter((i) => i.type !== "INVALID_RAMA" && i.type !== "INVALID_LIBRO" && i.type !== "QUERY_ERROR");

  if (criticalIssues.length > 0) {
    console.log(`\n  ❌ CRITICAL ISSUES: ${criticalIssues.length}`);
    for (const i of criticalIssues) {
      console.log(`     [${i.model}] ${i.type}: ${i.detail}`);
    }
  }

  if (warnings.length > 0) {
    console.log(`\n  ⚠ WARNINGS: ${warnings.length}`);
    for (const w of warnings) {
      console.log(`     [${w.model}] ${w.type}: ${w.detail}`);
    }
  }

  if (issues.length === 0) {
    console.log("\n  ✅ VEREDICTO: PASS — Todo el contenido está correctamente clasificado");
  } else if (criticalIssues.length === 0) {
    console.log("\n  ✅ VEREDICTO: PASS (con warnings menores)");
  } else {
    console.log("\n  ❌ VEREDICTO: ISSUES FOUND — Revisar los errores críticos arriba");
  }

  console.log();
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
