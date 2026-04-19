/**
 * Fase 5 — Apply: aplica las decisiones del LLM desde outputs/fase-5-plan.csv
 * ──────────────────────────────────────────────────────────────────────────
 * Formato CSV esperado (producido por fase5-dry-run.ts):
 *   model,id,kind,rama,old_titulo,new_titulo,new_parrafo,confidence,reasoning
 *
 * Reglas:
 *   • kind=P5  → UPDATE parrafo = new_parrafo (titulo no cambia)
 *   • kind=R8  → UPDATE titulo = new_titulo
 *                (+ parrafo si new_parrafo no vacío)
 *
 * Por defecto sólo aplica confidence=high.
 * Con --include-medium también aplica confidence=medium.
 *
 * Flags:
 *   --apply              → escribe en DB (sin esto, sólo imprime resumen)
 *   --include-medium     → incluye confidence=medium (default: sólo high)
 *   --only-kind P5|R8    → filtra por kind
 *
 * Uso:
 *   npx tsx scripts/fase5-apply.ts                 # dry-run (muestra lo que haría)
 *   npx tsx scripts/fase5-apply.ts --apply         # aplica high
 *   npx tsx scripts/fase5-apply.ts --apply --include-medium
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

// ─── Flags ───
const argv = process.argv.slice(2);
const APPLY = argv.includes("--apply");
const INCLUDE_MEDIUM = argv.includes("--include-medium");
const onlyKindIdx = argv.indexOf("--only-kind");
const ONLY_KIND = onlyKindIdx >= 0 ? argv[onlyKindIdx + 1] : null;

// ─── CSV parser (mismo dialecto que fase4-apply) ───
interface PlanRow {
  model: string;
  id: string;
  kind: "P5" | "R8";
  rama: string;
  old_titulo: string;
  new_titulo: string;
  new_parrafo: string;
  confidence: "high" | "medium" | "low" | "unknown";
  reasoning: string;
}

function parseCsv(filePath: string): PlanRow[] {
  const raw = fs.readFileSync(filePath, "utf-8");
  const lines = raw.split("\n").filter((l) => l.length > 0);
  const rows: PlanRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    const cells: string[] = [];
    let cur = "", inQ = false;
    for (let j = 0; j < line.length; j++) {
      const ch = line[j];
      if (ch === '"') {
        if (inQ && line[j + 1] === '"') { cur += '"'; j++; }
        else { inQ = !inQ; }
      } else if (ch === "," && !inQ) { cells.push(cur); cur = ""; }
      else { cur += ch; }
    }
    cells.push(cur);
    rows.push({
      model: cells[0],
      id: cells[1],
      kind: (cells[2] as "P5" | "R8"),
      rama: cells[3],
      old_titulo: cells[4],
      new_titulo: cells[5],
      new_parrafo: cells[6],
      confidence: (cells[7] as PlanRow["confidence"]),
      reasoning: cells[8] ?? "",
    });
  }
  return rows;
}

function selectApplicable(plan: PlanRow[]): PlanRow[] {
  return plan.filter((r) => {
    if (ONLY_KIND && r.kind !== ONLY_KIND) return false;
    const confOk = r.confidence === "high" || (INCLUDE_MEDIUM && r.confidence === "medium");
    if (!confOk) return false;
    if (r.kind === "P5") return Boolean(r.new_parrafo);
    if (r.kind === "R8") return Boolean(r.new_titulo);
    return false;
  });
}

// mapping model → prisma client key (idéntico a los modelos del schema)
function clientFor(model: string): string {
  if (model === "mcq") return "mCQ";
  return model;
}

// tituloField por modelo (los *Materia usan `tituloMateria`)
const TITULO_FIELD: Record<string, "titulo" | "tituloMateria"> = {
  flashcard: "titulo",
  mcq: "titulo",
  trueFalse: "titulo",
  definicion: "titulo",
  fillBlank: "titulo",
  errorIdentification: "titulo",
  orderSequence: "tituloMateria",
  matchColumns: "tituloMateria",
  casoPractico: "tituloMateria",
  dictadoJuridico: "tituloMateria",
  timeline: "tituloMateria",
};

async function applyForModel(model: string, rows: PlanRow[]) {
  const toApply = rows.filter((r) => r.model === model);
  if (toApply.length === 0) return { updated: 0, skipped: 0 };

  const kindCounts: Record<string, number> = {};
  const confCounts: Record<string, number> = {};
  for (const r of toApply) {
    kindCounts[r.kind] = (kindCounts[r.kind] ?? 0) + 1;
    confCounts[r.confidence] = (confCounts[r.confidence] ?? 0) + 1;
  }
  const summary = `${Object.entries(kindCounts).map(([k, v]) => `${k}:${v}`).join(" ")} · ${Object.entries(confCounts).map(([k, v]) => `${k}:${v}`).join(" ")}`;
  console.log(`  [${model.padEnd(22)}] plan: ${toApply.length.toString().padStart(4)} updates  (${summary})`);

  if (!APPLY) return { updated: 0, skipped: 0 };

  const tituloField = TITULO_FIELD[model];
  if (!tituloField) { console.error(`  [${model}] ERROR: tituloField no mapeado`); return { updated: 0, skipped: toApply.length }; }

  let updated = 0, skipped = 0;
  const BATCH = 50;
  for (let i = 0; i < toApply.length; i += BATCH) {
    const batch = toApply.slice(i, i + BATCH);
    try {
      await prisma.$transaction(
        batch.map((r) => {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const cli: any = (prisma as any)[clientFor(model)];
          const data: Record<string, string | null> = {};
          if (r.kind === "R8") {
            data[tituloField] = r.new_titulo;
            // set parrafo only if LLM chose one; else clear to NULL to force later Fase 4-style
            data.parrafo = r.new_parrafo ? r.new_parrafo : null;
          } else {
            // P5: titulo se conserva, solo parrafo
            data.parrafo = r.new_parrafo;
          }
          return cli.update({ where: { id: r.id }, data });
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
  const csvPath = path.join(process.cwd(), "outputs", "fase-5-plan.csv");
  if (!fs.existsSync(csvPath)) {
    console.error(`ERROR: No encuentro ${csvPath}. Corre primero: npx tsx scripts/fase5-dry-run.ts`);
    process.exit(1);
  }
  console.log(`Leyendo plan: ${csvPath}`);
  const plan = parseCsv(csvPath);
  console.log(`Plan: ${plan.length} filas.`);

  // Distribución confidence × kind
  const distrib: Record<string, Record<string, number>> = { P5: {}, R8: {} };
  for (const r of plan) {
    distrib[r.kind] = distrib[r.kind] ?? {};
    distrib[r.kind][r.confidence] = (distrib[r.kind][r.confidence] ?? 0) + 1;
  }
  console.log("\nDistribución (kind × confidence):");
  for (const k of ["P5", "R8"] as const) {
    const s = distrib[k] ?? {};
    console.log(`  ${k}: high=${s.high ?? 0} medium=${s.medium ?? 0} low=${s.low ?? 0} unknown=${s.unknown ?? 0}`);
  }

  const toApply = selectApplicable(plan);
  console.log(
    `\nSelección aplicable: ${toApply.length}` +
    ` (confidence=${INCLUDE_MEDIUM ? "high+medium" : "high"}` +
    `${ONLY_KIND ? `, kind=${ONLY_KIND}` : ""}` +
    ")" +
    (APPLY ? "" : "  [DRY-RUN · sin escrituras]")
  );

  const models = [
    "flashcard", "mcq", "trueFalse", "definicion", "fillBlank", "errorIdentification",
    "orderSequence", "matchColumns", "casoPractico", "dictadoJuridico", "timeline",
  ];

  console.log();
  let grandTotal = 0, grandSkip = 0;
  const perModel: { model: string; updated: number; skipped: number; planned: number }[] = [];
  for (const m of models) {
    const planned = toApply.filter((r) => r.model === m).length;
    const { updated, skipped } = await applyForModel(m, toApply);
    grandTotal += updated;
    grandSkip += skipped;
    perModel.push({ model: m, updated, skipped, planned });
  }

  console.log("\n═══ APPLY SUMMARY ═══");
  for (const m of perModel) {
    if (m.planned === 0) continue;
    console.log(`  ${m.model.padEnd(24)} planned=${m.planned} updated=${m.updated}${m.skipped ? ` skipped=${m.skipped}` : ""}`);
  }
  console.log(`  ──────────────────────`);
  console.log(`  TOTAL planned: ${toApply.length}`);
  console.log(`  TOTAL updated: ${grandTotal}`);
  if (grandSkip) console.log(`  TOTAL skipped: ${grandSkip}`);

  if (APPLY) {
    const reportPath = path.join(process.cwd(), "outputs", "fase-5-apply.md");
    const residuals = plan.filter((r) => {
      const confOk = r.confidence === "high" || (INCLUDE_MEDIUM && r.confidence === "medium");
      return !confOk;
    });
    const report = [
      `# Fase 5 — Apply reporte`,
      ``,
      `_Ejecutado ${new Date().toISOString()}_`,
      ``,
      `## Parámetros`,
      ``,
      `- \`--apply\`: sí`,
      `- \`--include-medium\`: ${INCLUDE_MEDIUM ? "sí" : "no"}`,
      `- Filtro kind: ${ONLY_KIND ?? "todos"}`,
      ``,
      `## Totales`,
      ``,
      `- Plan leído: **${plan.length}** filas`,
      `- Aplicadas (confidence ok + new value): **${grandTotal}**`,
      `- Residuos (para revisión editorial): **${residuals.length}**`,
      grandSkip > 0 ? `- Errores: **${grandSkip}**` : ``,
      ``,
      `## Por modelo`,
      ``,
      `| Modelo | planned | updated |`,
      `|--------|--------:|--------:|`,
      ...perModel.filter((m) => m.planned > 0).map((m) => `| ${m.model} | ${m.planned} | ${m.updated} |`),
      ``,
      `## Residuos por confidence`,
      ``,
      `| Kind | low | unknown |`,
      `|------|----:|--------:|`,
      `| P5 | ${residuals.filter((r) => r.kind === "P5" && r.confidence === "low").length} | ${residuals.filter((r) => r.kind === "P5" && r.confidence === "unknown").length} |`,
      `| R8 | ${residuals.filter((r) => r.kind === "R8" && r.confidence === "low").length} | ${residuals.filter((r) => r.kind === "R8" && r.confidence === "unknown").length} |`,
      ``,
      `## Siguientes pasos`,
      ``,
      `- Fase 6: extraer integradores a dropdown + UI "Estudiar".`,
      `- Los residuos low/unknown quedan para triage editorial manual.`,
      ``,
    ].filter(Boolean).join("\n");
    fs.writeFileSync(reportPath, report);
    console.log(`\nReporte → ${reportPath}`);
  } else {
    console.log(`\n[DRY-RUN] Para aplicar: npx tsx scripts/fase5-apply.ts --apply${INCLUDE_MEDIUM ? " --include-medium" : ""}`);
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Fatal:", e); await prisma.$disconnect(); process.exit(1); });
