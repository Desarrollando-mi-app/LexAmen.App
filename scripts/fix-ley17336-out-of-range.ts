/**
 * Fix — LEY_17336 out-of-range + parrafo-orphans L17336
 * ──────────────────────────────────────────────────────
 * Arregla 3 tipos de inconsistencia detectadas por Fase 9 QA:
 *
 *   1. Parrafo-orphans en L17336 (7 rows)
 *      · titulo=L17336_T* pero parrafo=LIV_T*_P* (héredado erróneo de peer-vote)
 *      → reset parrafo = null
 *
 *   2. libro=LEY_17336 con título formal civil (LIV_T*, LI_T*, TP_*, …)
 *      · el título apunta a otro libro según CURRICULUM; el libro "miente"
 *      → reset libro = <libro-del-titulo-según-CURRICULUM>
 *
 *   3. libro=LEY_17336 con título free-text ("Derechos del autor: ...")
 *      · títulos no curriculares; imports antiguos sin mapeo
 *      → reset libro = LEY_17336, titulo = L17336_T1, parrafo = null
 *        (fallback conservador: vuelven al root del libro de propiedad intelectual)
 *
 * Uso:
 *   npx tsx scripts/fix-ley17336-out-of-range.ts --dry  # preview
 *   npx tsx scripts/fix-ley17336-out-of-range.ts        # APLICA
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry");

// ─── Build titulo → { rama, libro } from CURRICULUM ───────
const tituloMeta = new Map<string, { rama: string; libro: string }>();
for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  for (const sec of (rama as any).secciones ?? []) {
    for (const t of sec.titulos ?? []) {
      if (!tituloMeta.has(t.id)) tituloMeta.set(t.id, { rama: ramaKey, libro: sec.libro });
    }
  }
}

// ─── Helpers ──────────────────────────────────────────────
function isL17336Titulo(t: string | null): boolean {
  return !!t && t.startsWith("L17336_");
}

function parrafoValidoParaTitulo(parrafo: string | null, titulo: string | null): boolean {
  if (!parrafo) return true; // null es válido (título-level)
  if (!titulo) return false;
  return parrafo.startsWith(`${titulo}_P`);
}

// ─── Models ───────────────────────────────────────────────
const MODELS = [
  { key: "flashcard", label: "Flashcard" },
  { key: "mCQ", label: "MCQ" },
  { key: "trueFalse", label: "TrueFalse" },
  { key: "definicion", label: "Definicion" },
  { key: "fillBlank", label: "FillBlank" },
  { key: "errorIdentification", label: "ErrorIdentification" },
  { key: "orderSequence", label: "OrderSequence" },
  { key: "matchColumns", label: "MatchColumns" },
  { key: "casoPractico", label: "CasoPractico" },
  { key: "dictadoJuridico", label: "DictadoJuridico" },
  { key: "timeline", label: "Timeline" },
];

interface FixRow {
  model: string;
  id: string;
  rama: string | null;
  libroBefore: string | null;
  tituloBefore: string | null;
  parrafoBefore: string | null;
  libroAfter: string | null;
  tituloAfter: string | null;
  parrafoAfter: string | null;
  category: "P1_parrafo_orphan" | "P2_libro_mismatch" | "P3_freetext_titulo";
}

async function main() {
  const fixes: FixRow[] = [];

  for (const m of MODELS) {
    // Candidates: libro=LEY_17336 OR titulo starts with L17336_
    const rows: Array<{ id: string; rama: string | null; libro: string | null; titulo: string | null; parrafo: string | null }> =
      await (prisma as any)[m.key].findMany({
        where: {
          OR: [
            { libro: "LEY_17336" as any },
            { titulo: { startsWith: "L17336_" } },
          ],
        },
        select: { id: true, rama: true, libro: true, titulo: true, parrafo: true },
      });

    for (const r of rows) {
      // Category 1 · Parrafo-orphan: título L17336_* + parrafo que no pertenece
      if (isL17336Titulo(r.titulo) && !parrafoValidoParaTitulo(r.parrafo, r.titulo)) {
        fixes.push({
          model: m.key, id: r.id, rama: r.rama,
          libroBefore: r.libro, tituloBefore: r.titulo, parrafoBefore: r.parrafo,
          libroAfter: r.libro, tituloAfter: r.titulo, parrafoAfter: null,
          category: "P1_parrafo_orphan",
        });
        continue;
      }

      // Solo procesar más si libro=LEY_17336
      if (r.libro !== "LEY_17336") continue;

      // Category 2 · libro=LEY_17336 + título formal no-L17336 (tiene meta en CURRICULUM)
      if (r.titulo && !isL17336Titulo(r.titulo) && tituloMeta.has(r.titulo)) {
        const meta = tituloMeta.get(r.titulo)!;
        fixes.push({
          model: m.key, id: r.id, rama: r.rama,
          libroBefore: r.libro, tituloBefore: r.titulo, parrafoBefore: r.parrafo,
          libroAfter: meta.libro, tituloAfter: r.titulo, parrafoAfter: r.parrafo,
          category: "P2_libro_mismatch",
        });
        continue;
      }

      // Category 3 · libro=LEY_17336 + título free-text (no existe en CURRICULUM)
      if (r.titulo && !isL17336Titulo(r.titulo) && !tituloMeta.has(r.titulo)) {
        fixes.push({
          model: m.key, id: r.id, rama: r.rama,
          libroBefore: r.libro, tituloBefore: r.titulo, parrafoBefore: r.parrafo,
          libroAfter: "LEY_17336", tituloAfter: "L17336_T1", parrafoAfter: null,
          category: "P3_freetext_titulo",
        });
        continue;
      }
    }
  }

  // ─── Stats ──────────────────────────────────────────────
  const byCat: Record<string, number> = {};
  const byModel: Record<string, number> = {};
  for (const f of fixes) {
    byCat[f.category] = (byCat[f.category] ?? 0) + 1;
    byModel[f.model] = (byModel[f.model] ?? 0) + 1;
  }

  console.log(`\n═══ Fix LEY_17336 · ${DRY ? "DRY-RUN" : "APPLY"} ═══`);
  console.log(`Total fixes: ${fixes.length}`);
  console.log(`  P1 (parrafo-orphan reset a null):   ${byCat.P1_parrafo_orphan ?? 0}`);
  console.log(`  P2 (libro realineado al título):    ${byCat.P2_libro_mismatch ?? 0}`);
  console.log(`  P3 (free-text → L17336_T1 default): ${byCat.P3_freetext_titulo ?? 0}`);
  console.log();
  console.log("Por modelo:");
  for (const [k, v] of Object.entries(byModel).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }

  // Samples
  console.log("\nMuestras por categoría:");
  for (const cat of ["P1_parrafo_orphan", "P2_libro_mismatch", "P3_freetext_titulo"]) {
    const sample = fixes.filter((f) => f.category === cat).slice(0, 3);
    if (sample.length === 0) continue;
    console.log(`\n── ${cat} ──`);
    for (const f of sample) {
      console.log(`  ${f.model}/${f.id.slice(0, 12)}`);
      console.log(`    ${f.libroBefore}/${f.tituloBefore}/${f.parrafoBefore ?? "(null)"}`);
      console.log(`  → ${f.libroAfter}/${f.tituloAfter}/${f.parrafoAfter ?? "(null)"}`);
    }
  }

  if (DRY) {
    console.log("\nDRY-RUN: no se escribió nada.");
    await prisma.$disconnect();
    return;
  }

  // ─── Apply ──────────────────────────────────────────────
  let applied = 0;
  let errors = 0;
  for (const f of fixes) {
    try {
      await (prisma as any)[f.model].update({
        where: { id: f.id },
        data: {
          libro: f.libroAfter as any,
          titulo: f.tituloAfter,
          parrafo: f.parrafoAfter,
        },
      });
      applied++;
    } catch (e) {
      errors++;
      console.error(`  ERROR ${f.model}/${f.id}:`, (e as Error).message);
    }
  }
  console.log(`\n✓ Aplicadas: ${applied} · errores: ${errors}`);

  // ─── Report ─────────────────────────────────────────────
  const outDir = path.join(process.cwd(), "outputs");
  fs.mkdirSync(outDir, { recursive: true });
  const reportPath = path.join(outDir, "fix-ley17336-report.md");
  const md: string[] = [];
  md.push("# Fix · LEY_17336 out-of-range + parrafo-orphans");
  md.push("");
  md.push(`_Generado ${new Date().toISOString()}._`);
  md.push("");
  md.push("## Resumen");
  md.push("");
  md.push("| Categoría | Rows |");
  md.push("|-----------|-----:|");
  md.push(`| P1 · parrafo-orphan (reset null) | ${byCat.P1_parrafo_orphan ?? 0} |`);
  md.push(`| P2 · libro realineado al título | ${byCat.P2_libro_mismatch ?? 0} |`);
  md.push(`| P3 · free-text → L17336_T1 default | ${byCat.P3_freetext_titulo ?? 0} |`);
  md.push(`| **Total aplicados** | **${applied}** |`);
  md.push(`| Errores | ${errors} |`);
  md.push("");
  md.push("## Por modelo");
  md.push("");
  md.push("| Modelo | Rows |");
  md.push("|--------|-----:|");
  for (const [k, v] of Object.entries(byModel).sort((a, b) => b[1] - a[1])) {
    md.push(`| ${k} | ${v} |`);
  }
  md.push("");
  fs.writeFileSync(reportPath, md.join("\n"));
  console.log(`Reporte → ${reportPath}`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
