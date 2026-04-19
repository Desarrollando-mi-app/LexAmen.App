/**
 * Fase 3 — Apply: aplica los UPDATEs planificados en outputs/fase-3-plan.csv
 * ─────────────────────────────────────────────────────────────────────────
 * Lee el plan generado por fase3-dry-run.ts y ejecuta:
 *   - R1: esIntegrador=true (mantiene titulo/rama)
 *   - R2 / R3' / R3'' / R4' / R4'' / R5 / R6 / R7: actualiza titulo (o tituloMateria) y opcionalmente rama
 *   - R8 / RM: NO SE TOCAN (quedan para Fase 5 y triage manual)
 *
 * Ejecuta una transacción por modelo. Progreso en consola.
 *
 * Uso: npx tsx scripts/fase3-apply.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  dotenv.config({ path: ".env", quiet: true });
}
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado en .env.local");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Parse plan CSV ───
interface PlanRow {
  model: string;
  id: string;
  rule: string;
  old_rama: string;
  old_libro: string;
  old_titulo: string;
  new_rama: string;
  new_titulo: string;
  esIntegrador: boolean;
  note: string;
}

function parseCsv(filePath: string): PlanRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const header = lines[0].split(",");
  const rows: PlanRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    // Parser simple tolerante a comas dentro de comillas
    const line = lines[i];
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j + 1] === '"') {
          cur += '"';
          j++;
        } else {
          inQ = !inQ;
        }
      } else if (ch === "," && !inQ) {
        cells.push(cur);
        cur = "";
      } else {
        cur += ch;
      }
    }
    cells.push(cur);
    rows.push({
      model: cells[0],
      id: cells[1],
      rule: cells[2],
      old_rama: cells[3],
      old_libro: cells[4],
      old_titulo: cells[5],
      new_rama: cells[6],
      new_titulo: cells[7],
      esIntegrador: cells[8] === "true",
      note: cells[9] ?? "",
    });
  }
  return rows;
}

// ─── Modelos por nombre ───
// 6 modelos usan `titulo`, 5 usan `tituloMateria`
const MODELS_TITULO = new Set(["flashcard", "mcq", "trueFalse", "definicion", "fillBlank", "errorIdentification"]);
const MODELS_TITULO_MATERIA = new Set(["orderSequence", "matchColumns", "casoPractico", "dictadoJuridico", "timeline"]);

// Reglas que NO tocan la base (quedan como están)
const SKIP_RULES = new Set(["R8", "RM", "ALREADY_VALID", "AMBIGUOUS"]);

// ─── Dispatcher ───
async function applyForModel(model: string, rows: PlanRow[]): Promise<{ updated: number; skipped: number }> {
  const toApply = rows.filter((r) => r.model === model && !SKIP_RULES.has(r.rule));
  let updated = 0;
  let skipped = 0;

  const usesTituloMateria = MODELS_TITULO_MATERIA.has(model);

  // Agrupamos para logs limpios
  const ruleCounts: Record<string, number> = {};
  for (const r of toApply) ruleCounts[r.rule] = (ruleCounts[r.rule] ?? 0) + 1;
  const ruleSummary = Object.entries(ruleCounts).map(([k, v]) => `${k}:${v}`).join(" ");
  console.log(`  [${model}] plan: ${toApply.length} updates  (${ruleSummary})`);

  const BATCH = 50;
  for (let i = 0; i < toApply.length; i += BATCH) {
    const batch = toApply.slice(i, i + BATCH);
    try {
      await prisma.$transaction(
        batch.map((r) => {
          const data: Record<string, unknown> = {};
          if (r.new_rama !== r.old_rama) data.rama = r.new_rama as unknown;
          if (usesTituloMateria) {
            if (r.new_titulo !== r.old_titulo) data.tituloMateria = r.new_titulo;
          } else {
            if (r.new_titulo !== r.old_titulo) data.titulo = r.new_titulo;
          }
          if (r.esIntegrador) data.esIntegrador = true;

          // mapeo de nombres CSV → propiedad del client Prisma
          const clientName = r.model === "mcq" ? "mCQ" : r.model;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const model_: any = (prisma as any)[clientName];
          return model_.update({ where: { id: r.id }, data });
        }),
        { timeout: 60_000, maxWait: 10_000 }
      );
      updated += batch.length;
    } catch (e) {
      skipped += batch.length;
      console.error(`  [${model}] batch ${i}/${toApply.length} ERROR:`, e instanceof Error ? e.message.slice(0, 200) : e);
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= toApply.length) {
      const done = Math.min(i + BATCH, toApply.length);
      console.log(`  [${model}] progress: ${done}/${toApply.length}`);
    }
  }
  return { updated, skipped };
}

async function main() {
  const csvPath = path.join(process.cwd(), "outputs", "fase-3-plan.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: No encuentro ${csvPath}. Corre primero: npx tsx scripts/fase3-dry-run.ts`);
    process.exit(1);
  }
  console.log(`Leyendo plan: ${csvPath}`);
  const plan = parseCsv(csvPath);
  console.log(`Plan tiene ${plan.length} filas.`);

  const ruleCounts: Record<string, number> = {};
  for (const r of plan) ruleCounts[r.rule] = (ruleCounts[r.rule] ?? 0) + 1;
  console.log("\nDistribución en el plan:");
  for (const [k, v] of Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(8)} ${v}${SKIP_RULES.has(k) ? " [SKIP]" : ""}`);
  }

  const totalApplicable = plan.filter((r) => !SKIP_RULES.has(r.rule)).length;
  console.log(`\nTotal a aplicar: ${totalApplicable}\n`);

  const models = [
    "flashcard",
    "mcq",
    "trueFalse",
    "definicion",
    "fillBlank",
    "errorIdentification",
    "orderSequence",
    "matchColumns",
    "casoPractico",
    "dictadoJuridico",
    "timeline",
  ];

  let grandTotal = 0;
  let grandSkip = 0;
  const perModel: { model: string; updated: number; skipped: number }[] = [];
  for (const model of models) {
    const { updated, skipped } = await applyForModel(model, plan);
    grandTotal += updated;
    grandSkip += skipped;
    perModel.push({ model, updated, skipped });
  }

  console.log("\n═══ APPLY SUMMARY ═══");
  for (const m of perModel) {
    console.log(`  ${m.model.padEnd(24)} updated=${m.updated}${m.skipped > 0 ? ` skipped=${m.skipped}` : ""}`);
  }
  console.log(`  ──────────────────────`);
  console.log(`  TOTAL updated: ${grandTotal}`);
  if (grandSkip > 0) console.log(`  TOTAL skipped (errores): ${grandSkip}`);
  console.log(`  R8 + RM intocadas (para Fase 5 / triage manual).`);

  // Reporte
  const reportPath = path.join(process.cwd(), "outputs", "fase-3-apply.md");
  const report = [
    `# Fase 3 — Apply reporte`,
    ``,
    `_Ejecutado ${new Date().toISOString()}_`,
    ``,
    `## Totales`,
    ``,
    `- Plan leído: **${plan.length}** filas`,
    `- UPDATEs aplicadas: **${grandTotal}**`,
    `- Filas intocadas (R8 + RM): **${plan.filter((r) => SKIP_RULES.has(r.rule)).length}**`,
    grandSkip > 0 ? `- Errores: **${grandSkip}**` : ``,
    ``,
    `## Por modelo`,
    ``,
    `| Modelo | updated | skipped |`,
    `|--------|--------:|--------:|`,
    ...perModel.map((m) => `| ${m.model} | ${m.updated} | ${m.skipped} |`),
    ``,
    `## Siguientes pasos`,
    ``,
    `- Re-correr catastro (Fase 9) confirma que los huérfanos bajaron a ~${plan.filter((r) => SKIP_RULES.has(r.rule)).length}.`,
    `- Las filas R8/RM siguen siendo candidatas para Fase 5 (rebalanceo) o triage editorial (eliminación/catalogo aparte).`,
    ``,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(reportPath, report);
  console.log(`\nReporte → ${reportPath}`);
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("Fatal:", e);
    await prisma.$disconnect();
    process.exit(1);
  });
