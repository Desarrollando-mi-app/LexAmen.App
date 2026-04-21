/**
 * Fase 7-bis — Apply script
 * ──────────────────────────
 * Lee outputs/fase-7bis-plan.csv, filtra a confidence in {high, medium} con
 * target_titulo no-null, y para cada row:
 *
 *   1) INSERT nueva fila en el mismo modelo con:
 *        - rama                 = target_rama
 *        - libro                = target_libro
 *        - titulo               = target_titulo
 *        - parrafo              = target_parrafo (puede ser null)
 *        - codigo               = derivado de target_rama
 *        - ramasAdicionales     = []
 *        - sourceExerciseId     = source.id
 *        - resto campos         = copia del source
 *   2) UPDATE source: array_remove target_rama de ramasAdicionales
 *
 * Idempotente: si ya existe una fila con (sourceExerciseId=source.id, rama=target_rama),
 * skip insert pero igual ajusta ramasAdicionales.
 *
 * Uso:
 *   npx tsx scripts/fase7bis-apply.ts --dry-run    # reporta sin tocar DB
 *   npx tsx scripts/fase7bis-apply.ts              # APLICA
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DATABASE_URL missing"); process.exit(1); }
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");

// ─── CSV parser ────────────────────────────────────────────
interface PlanRow {
  model: string;
  source_id: string;
  source_rama: string;
  source_titulo: string;
  target_rama: string;
  target_libro: string;
  target_titulo: string;
  target_parrafo: string;
  r8_hits: string;
  r8_matched: string;
  parrafo_rule: string;
  parrafo_note: string;
  confidence: string;
  excerpt: string;
}

function parseCSV(text: string): PlanRow[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQuotes = false;
      } else cell += ch;
    } else {
      if (ch === '"') inQuotes = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); lines.push(row); row = []; cell = ""; }
      else if (ch !== "\r") cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); lines.push(row); }
  const [header, ...data] = lines;
  return data.filter((r) => r.length > 1).map((r) => {
    const obj: Record<string, string> = {};
    header.forEach((h, i) => (obj[h] = r[i] ?? ""));
    return obj as unknown as PlanRow;
  });
}

// ─── Mapeos ────────────────────────────────────────────────
const RAMA_TO_CODIGO: Record<string, string> = {
  DERECHO_CIVIL: "CODIGO_CIVIL",
  DERECHO_PROCESAL_CIVIL: "CODIGO_PROCEDIMIENTO_CIVIL",
  DERECHO_ORGANICO: "CODIGO_ORGANICO_TRIBUNALES",
};

// ─── Main ──────────────────────────────────────────────────
async function main() {
  const csvPath = path.resolve("outputs/fase-7bis-plan.csv");
  const plan = parseCSV(fs.readFileSync(csvPath, "utf-8"));

  const applicable = plan.filter(
    (p) => (p.confidence === "high" || p.confidence === "medium") && p.target_titulo && p.target_libro,
  );

  console.log(`Total plan rows: ${plan.length}`);
  console.log(`Applicable (high|medium + titulo+libro): ${applicable.length}`);
  console.log(`Mode: ${DRY_RUN ? "DRY-RUN (no DB writes)" : "APPLY (writes enabled)"}`);

  if (applicable.length === 0) { console.log("Nada que aplicar."); return; }

  const stats = { inserted: 0, alreadyExists: 0, updatedRamas: 0, errors: 0 };
  const perModel: Record<string, number> = {};
  const logs: string[] = [];

  for (const p of applicable) {
    const codigo = RAMA_TO_CODIGO[p.target_rama];
    if (!codigo) {
      stats.errors++;
      logs.push(`skip: rama target sin codigo: ${p.target_rama}`);
      continue;
    }

    try {
      if (p.model === "flashcard") {
        const src = await prisma.flashcard.findUnique({ where: { id: p.source_id } });
        if (!src) { stats.errors++; logs.push(`flashcard ${p.source_id} no existe`); continue; }
        const existing = await prisma.flashcard.findFirst({
          where: { sourceExerciseId: src.id, rama: p.target_rama as never },
        });
        if (existing) stats.alreadyExists++;
        else if (!DRY_RUN) {
          await prisma.flashcard.create({
            data: {
              front: src.front, back: src.back,
              rama: p.target_rama as never,
              ramasAdicionales: [],
              codigo: codigo as never,
              libro: p.target_libro as never,
              titulo: p.target_titulo,
              parrafo: p.target_parrafo || null,
              leyAnexa: src.leyAnexa, articuloRef: src.articuloRef, dificultad: src.dificultad,
              esIntegrador: src.esIntegrador,
              sourceExerciseId: src.id,
              institucionId: src.institucionId,
            },
          });
          stats.inserted++;
        } else stats.inserted++;

        if (!DRY_RUN) {
          await prisma.$executeRawUnsafe(
            `UPDATE "Flashcard" SET "ramasAdicionales" = array_remove("ramasAdicionales", $1::"Rama") WHERE id = $2`,
            p.target_rama, src.id,
          );
        }
        stats.updatedRamas++;
      } else if (p.model === "mcq") {
        const src = await prisma.mCQ.findUnique({ where: { id: p.source_id } });
        if (!src) { stats.errors++; logs.push(`mcq ${p.source_id} no existe`); continue; }
        const existing = await prisma.mCQ.findFirst({
          where: { sourceExerciseId: src.id, rama: p.target_rama as never },
        });
        if (existing) stats.alreadyExists++;
        else if (!DRY_RUN) {
          await prisma.mCQ.create({
            data: {
              question: src.question, optionA: src.optionA, optionB: src.optionB,
              optionC: src.optionC, optionD: src.optionD, correctOption: src.correctOption,
              explanation: src.explanation,
              rama: p.target_rama as never, ramasAdicionales: [],
              codigo: codigo as never, libro: p.target_libro as never,
              titulo: p.target_titulo, parrafo: p.target_parrafo || null,
              leyAnexa: src.leyAnexa, articuloRef: src.articuloRef, dificultad: src.dificultad,
              esIntegrador: src.esIntegrador, sourceExerciseId: src.id,
              institucionId: src.institucionId,
            },
          });
          stats.inserted++;
        } else stats.inserted++;

        if (!DRY_RUN) {
          await prisma.$executeRawUnsafe(
            `UPDATE "MCQ" SET "ramasAdicionales" = array_remove("ramasAdicionales", $1::"Rama") WHERE id = $2`,
            p.target_rama, src.id,
          );
        }
        stats.updatedRamas++;
      } else if (p.model === "trueFalse") {
        const src = await prisma.trueFalse.findUnique({ where: { id: p.source_id } });
        if (!src) { stats.errors++; logs.push(`trueFalse ${p.source_id} no existe`); continue; }
        const existing = await prisma.trueFalse.findFirst({
          where: { sourceExerciseId: src.id, rama: p.target_rama as never },
        });
        if (existing) stats.alreadyExists++;
        else if (!DRY_RUN) {
          await prisma.trueFalse.create({
            data: {
              statement: src.statement, isTrue: src.isTrue, explanation: src.explanation,
              rama: p.target_rama as never, ramasAdicionales: [],
              codigo: codigo as never, libro: p.target_libro as never,
              titulo: p.target_titulo, parrafo: p.target_parrafo || null,
              leyAnexa: src.leyAnexa, articuloRef: src.articuloRef, dificultad: src.dificultad,
              esIntegrador: src.esIntegrador, sourceExerciseId: src.id,
              institucionId: src.institucionId,
            },
          });
          stats.inserted++;
        } else stats.inserted++;

        if (!DRY_RUN) {
          await prisma.$executeRawUnsafe(
            `UPDATE "TrueFalse" SET "ramasAdicionales" = array_remove("ramasAdicionales", $1::"Rama") WHERE id = $2`,
            p.target_rama, src.id,
          );
        }
        stats.updatedRamas++;
      } else if (p.model === "definicion") {
        const src = await prisma.definicion.findUnique({ where: { id: p.source_id } });
        if (!src) { stats.errors++; logs.push(`definicion ${p.source_id} no existe`); continue; }
        const existing = await prisma.definicion.findFirst({
          where: { sourceExerciseId: src.id, rama: p.target_rama as never },
        });
        if (existing) stats.alreadyExists++;
        else if (!DRY_RUN) {
          await prisma.definicion.create({
            data: {
              concepto: src.concepto, definicion: src.definicion,
              rama: p.target_rama as never, ramasAdicionales: [],
              libro: p.target_libro, titulo: p.target_titulo,
              parrafo: p.target_parrafo || null,
              distractor1: src.distractor1, distractor2: src.distractor2, distractor3: src.distractor3,
              explicacion: src.explicacion, articuloRef: src.articuloRef,
              esIntegrador: src.esIntegrador, sourceExerciseId: src.id,
              institucionId: src.institucionId, isActive: src.isActive,
            },
          });
          stats.inserted++;
        } else stats.inserted++;

        if (!DRY_RUN) {
          // Definicion.ramasAdicionales es String[] no enum Rama[]
          await prisma.$executeRawUnsafe(
            `UPDATE "Definicion" SET "ramasAdicionales" = array_remove("ramasAdicionales", $1) WHERE id = $2`,
            p.target_rama, src.id,
          );
        }
        stats.updatedRamas++;
      } else {
        stats.errors++;
        logs.push(`modelo no soportado: ${p.model}`);
      }
      perModel[p.model] = (perModel[p.model] ?? 0) + 1;
    } catch (e) {
      stats.errors++;
      logs.push(`${p.model} ${p.source_id} → ${p.target_rama}: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  console.log(`\n═══ RESULT ═══`);
  console.log(`Inserted:       ${stats.inserted}`);
  console.log(`Already existed: ${stats.alreadyExists}`);
  console.log(`Ramas cleaned:  ${stats.updatedRamas}`);
  console.log(`Errors:         ${stats.errors}`);
  console.log(`Per model:`, perModel);

  // ─── MD output ───
  const md = [
    `# Fase 7-bis — Apply ${DRY_RUN ? "(DRY-RUN)" : ""}`,
    ``,
    `_Generado ${new Date().toISOString()}_`,
    ``,
    `## Resultado`,
    ``,
    `| Métrica | Valor |`,
    `|---|---:|`,
    `| Plan rows (total) | ${plan.length} |`,
    `| Applicable (high+medium con titulo+libro) | ${applicable.length} |`,
    `| Inserted | ${stats.inserted} |`,
    `| Already existed (idempotencia) | ${stats.alreadyExists} |`,
    `| Ramas cleaned (array_remove) | ${stats.updatedRamas} |`,
    `| Errors | ${stats.errors} |`,
    ``,
    `## Por modelo`,
    ``,
    `| Modelo | Count |`,
    `|---|---:|`,
    ...Object.entries(perModel).sort().map(([k, v]) => `| ${k} | ${v} |`),
    ``,
    ...(logs.length > 0 ? [`## Logs`, ``, ...logs.map((l) => `- ${l}`)] : []),
  ].join("\n");
  const mdPath = path.resolve(DRY_RUN ? "outputs/fase-7bis-apply-dryrun.md" : "outputs/fase-7bis-apply.md");
  fs.writeFileSync(mdPath, md);
  console.log(`MD → ${mdPath}`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(async () => { await prisma.$disconnect(); });
