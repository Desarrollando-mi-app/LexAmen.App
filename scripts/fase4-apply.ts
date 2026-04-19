/**
 * Fase 4 — Apply: asigna `parrafo` según outputs/fase-4-plan.csv
 * ──────────────────────────────────────────────────────────────
 * Aplica solo P2/P3/P4/P6. P1 (titulo sin parrafos) y P5 (ambiguo) quedan NULL.
 *
 * Uso: npx tsx scripts/fase4-apply.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

interface PlanRow {
  model: string;
  id: string;
  rule: string;
  titulo: string;
  new_parrafo: string;
  note: string;
}

function parseCsv(filePath: string): PlanRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const rows: PlanRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells: string[] = [];
    let cur = "";
    let inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j + 1] === '"') { cur += '"'; j++; }
        else { inQ = !inQ; }
      } else if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur);
    rows.push({ model: cells[0], id: cells[1], rule: cells[2], titulo: cells[3], new_parrafo: cells[4], note: cells[5] ?? "" });
  }
  return rows;
}

const APPLY_RULES = new Set(["P2", "P3", "P4", "P6"]);

async function applyForModel(model: string, rows: PlanRow[]) {
  const toApply = rows.filter((r) => r.model === model && APPLY_RULES.has(r.rule) && r.new_parrafo);
  let updated = 0, skipped = 0;

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
          const clientName = r.model === "mcq" ? "mCQ" : r.model;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const model_: any = (prisma as any)[clientName];
          return model_.update({ where: { id: r.id }, data: { parrafo: r.new_parrafo } });
        }),
        { timeout: 60_000, maxWait: 10_000 }
      );
      updated += batch.length;
    } catch (e) {
      skipped += batch.length;
      console.error(`  [${model}] batch ${i}/${toApply.length} ERROR:`, e instanceof Error ? e.message.slice(0, 200) : e);
    }
    if ((i + BATCH) % 500 === 0 || i + BATCH >= toApply.length) {
      console.log(`  [${model}] progress: ${Math.min(i + BATCH, toApply.length)}/${toApply.length}`);
    }
  }
  return { updated, skipped };
}

async function main() {
  const csvPath = path.join(process.cwd(), "outputs", "fase-4-plan.csv");
  if (!fs.existsSync(csvPath)) { console.error(`ERROR: No encuentro ${csvPath}`); process.exit(1); }
  console.log(`Leyendo plan: ${csvPath}`);
  const plan = parseCsv(csvPath);
  console.log(`Plan: ${plan.length} filas.`);

  const ruleCounts: Record<string, number> = {};
  for (const r of plan) ruleCounts[r.rule] = (ruleCounts[r.rule] ?? 0) + 1;
  console.log("\nDistribución en el plan:");
  for (const [k, v] of Object.entries(ruleCounts).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k.padEnd(6)} ${v}${APPLY_RULES.has(k) ? "" : " [SKIP]"}`);
  }

  const total = plan.filter((r) => APPLY_RULES.has(r.rule) && r.new_parrafo).length;
  console.log(`\nTotal a aplicar: ${total}\n`);

  const models = [
    "flashcard", "mcq", "trueFalse", "definicion", "fillBlank", "errorIdentification",
    "orderSequence", "matchColumns", "casoPractico", "dictadoJuridico", "timeline",
  ];

  let grandTotal = 0, grandSkip = 0;
  const perModel: { model: string; updated: number; skipped: number }[] = [];
  for (const m of models) {
    const { updated, skipped } = await applyForModel(m, plan);
    grandTotal += updated;
    grandSkip += skipped;
    perModel.push({ model: m, updated, skipped });
  }

  console.log("\n═══ APPLY SUMMARY ═══");
  for (const m of perModel) {
    console.log(`  ${m.model.padEnd(24)} updated=${m.updated}${m.skipped ? ` skipped=${m.skipped}` : ""}`);
  }
  console.log(`  ──────────────────────`);
  console.log(`  TOTAL updated: ${grandTotal}`);
  if (grandSkip) console.log(`  TOTAL skipped (errores): ${grandSkip}`);

  const reportPath = path.join(process.cwd(), "outputs", "fase-4-apply.md");
  const report = [
    `# Fase 4 — Apply reporte`,
    ``,
    `_Ejecutado ${new Date().toISOString()}_`,
    ``,
    `## Totales`,
    ``,
    `- Plan leído: **${plan.length}** filas`,
    `- UPDATEs aplicadas (parrafo asignado): **${grandTotal}**`,
    `- Filas sin cambio (P1 + P5): **${plan.filter((r) => !APPLY_RULES.has(r.rule)).length}**`,
    grandSkip > 0 ? `- Errores: **${grandSkip}**` : ``,
    ``,
    `## Por modelo`,
    ``,
    `| Modelo | updated |`,
    `|--------|--------:|`,
    ...perModel.map((m) => `| ${m.model} | ${m.updated} |`),
    ``,
    `## Siguientes pasos`,
    ``,
    `- Fase 5 (rebalanceo) aborda las ~2,446 P5 ambiguas + ~1,987 huérfanos residuales de Fase 3 (R8 + RM).`,
    ``,
  ].filter(Boolean).join("\n");
  fs.writeFileSync(reportPath, report);
  console.log(`\nReporte → ${reportPath}`);
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Fatal:", e); await prisma.$disconnect(); process.exit(1); });
