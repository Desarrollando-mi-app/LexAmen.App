/**
 * Fase 5 — Promote LOW: asigna párrafo a decisiones de baja confianza
 * ─────────────────────────────────────────────────────────────────────
 * Estrategia 100% determinística, sin LLM:
 *
 *   Para cada decisión con confidence="low" (solo aplica a P5):
 *     1. Busca los pares HIGH en el mismo (rama, titulo)
 *     2. Si hay párrafo dominante (≥50% de los pares) → heredar ese párrafo
 *     3. Si no hay mayoría → fallback a `${titulo}_P1` (P1 del título)
 *
 *   En ambos casos, se promueve confidence: "low" → "medium" y se
 *   sobreescribe `reasoning` con una nota que explique la promoción.
 *   El título NO cambia.
 *
 * Fuentes: outputs/fase-5-raw.json
 * Outputs:
 *   - outputs/fase-5-raw.json (in-place, backup previo en .bak)
 *   - outputs/fase-5-plan.csv (regenerado para que fase5-apply lo recoja)
 *   - outputs/fase-5-promote-report.md (log de cambios)
 *
 * Uso:
 *   npx tsx scripts/fase5-promote-low.ts           # ejecuta y escribe outputs
 *   npx tsx scripts/fase5-promote-low.ts --dry     # solo reporta, no escribe
 */

import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");

interface Candidate {
  kind: "P5" | "R8";
  model: string;
  id: string;
  rama: string;
  titulo: string;
  text: string;
}
interface Decision {
  kind: "P5" | "R8";
  chosenTitulo: string | null;
  chosenParrafo: string | null;
  confidence: "high" | "medium" | "low" | "unknown" | "error";
  reasoning: string;
  error?: string;
}

const outDir = path.join(process.cwd(), "outputs");
const rawPath = path.join(outDir, "fase-5-raw.json");
const bakPath = path.join(outDir, "fase-5-raw.json.bak-promote");
const csvPath = path.join(outDir, "fase-5-plan.csv");
const reportPath = path.join(outDir, "fase-5-promote-report.md");

const raw = JSON.parse(fs.readFileSync(rawPath, "utf-8")) as {
  cands: Candidate[];
  decisions: Decision[];
};
const { cands, decisions } = raw;

// ─── Build peer distribution from HIGH decisions ─────────
const peerDist: Record<string, Record<string, number>> = {};
for (let i = 0; i < decisions.length; i++) {
  const d = decisions[i];
  const c = cands[i];
  if (!d || d.error || c.kind !== "P5") continue;
  if (d.confidence !== "high") continue;
  const key = `${c.rama}|${c.titulo}`;
  if (!peerDist[key]) peerDist[key] = {};
  const p = d.chosenParrafo ?? "(null)";
  peerDist[key][p] = (peerDist[key][p] ?? 0) + 1;
}

// ─── Promote LOW rows ─────────────────────────────────────
interface Change {
  idx: number;
  model: string;
  id: string;
  rama: string;
  titulo: string;
  from: string | null;
  to: string;
  source: "peer-dominant" | "p1-fallback";
  peerTotal: number;
  peerDominance: number;
}
const changes: Change[] = [];

for (let i = 0; i < decisions.length; i++) {
  const d = decisions[i];
  const c = cands[i];
  if (!d || d.error || c.kind !== "P5") continue;
  if (d.confidence !== "low") continue;

  const key = `${c.rama}|${c.titulo}`;
  const peers = peerDist[key] ?? {};
  const peerTotal = Object.values(peers).reduce((a, b) => a + b, 0);
  const entries = Object.entries(peers).sort((a, b) => b[1] - a[1]);
  const top = entries[0];
  const dominance = top && peerTotal > 0 ? top[1] / peerTotal : 0;

  let newParrafo: string;
  let source: Change["source"];

  if (top && dominance >= 0.5 && top[0] !== "(null)") {
    newParrafo = top[0];
    source = "peer-dominant";
  } else {
    newParrafo = `${c.titulo}_P1`;
    source = "p1-fallback";
  }

  const fromParrafo = d.chosenParrafo;

  changes.push({
    idx: i,
    model: c.model,
    id: c.id,
    rama: c.rama,
    titulo: c.titulo,
    from: fromParrafo,
    to: newParrafo,
    source,
    peerTotal,
    peerDominance: dominance,
  });

  if (!DRY) {
    d.chosenParrafo = newParrafo;
    d.confidence = "medium";
    const reasonNote =
      source === "peer-dominant"
        ? `[PROMOTED low→medium · vecinos high ${Math.round(dominance * 100)}% → ${newParrafo}] ${d.reasoning}`
        : `[PROMOTED low→medium · sin mayoría de vecinos, fallback P1] ${d.reasoning}`;
    d.reasoning = reasonNote.slice(0, 500);
  }
}

// ─── Stats ────────────────────────────────────────────────
const byTitulo: Record<string, { count: number; peer: number; fallback: number }> = {};
for (const ch of changes) {
  const k = `${ch.rama}|${ch.titulo}`;
  if (!byTitulo[k]) byTitulo[k] = { count: 0, peer: 0, fallback: 0 };
  byTitulo[k].count++;
  if (ch.source === "peer-dominant") byTitulo[k].peer++;
  else byTitulo[k].fallback++;
}
const peerCount = changes.filter((c) => c.source === "peer-dominant").length;
const fallbackCount = changes.filter((c) => c.source === "p1-fallback").length;

console.log(`\n═══ Fase 5 · Promote LOW · ${DRY ? "DRY-RUN" : "APPLY"} ═══`);
console.log(`Total low P5 procesadas: ${changes.length}`);
console.log(`  · heredadas de vecinos high: ${peerCount}`);
console.log(`  · fallback a P1 del título:  ${fallbackCount}`);
console.log();
console.log("Por título:");
for (const [k, v] of Object.entries(byTitulo).sort((a, b) => b[1].count - a[1].count)) {
  console.log(`  ${k} — ${v.count} (peer=${v.peer}, P1=${v.fallback})`);
}

if (DRY) {
  console.log("\nDRY-RUN: no se escribió nada. Re-ejecuta sin --dry para aplicar.");
  process.exit(0);
}

// ─── Backup + write raw.json ──────────────────────────────
fs.copyFileSync(rawPath, bakPath);
console.log(`\nBackup raw → ${bakPath}`);
fs.writeFileSync(rawPath, JSON.stringify({ cands, decisions }, null, 2));
console.log(`Raw actualizado → ${rawPath}`);

// ─── Regenerate plan.csv ──────────────────────────────────
const csvEscape = (raw: unknown): string => {
  const s = String(raw ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};
const lines: string[] = [
  "model,id,kind,rama,old_titulo,new_titulo,new_parrafo,confidence,reasoning",
];
for (let i = 0; i < cands.length; i++) {
  const c = cands[i];
  const d = decisions[i] ?? ({} as Partial<Decision>);
  lines.push(
    [
      c.model,
      c.id,
      c.kind,
      c.rama,
      c.titulo,
      d.chosenTitulo ?? "",
      d.chosenParrafo ?? "",
      d.confidence ?? "unknown",
      d.reasoning ?? "",
    ]
      .map(csvEscape)
      .join(",")
  );
}
fs.writeFileSync(csvPath, lines.join("\n"));
console.log(`CSV regenerado → ${csvPath}`);

// ─── Report ───────────────────────────────────────────────
const md: string[] = [];
md.push("# Fase 5 · Promoción de LOW → MEDIUM");
md.push("");
md.push(`_Generado ${new Date().toISOString()}. Estrategia determinística, sin LLM._`);
md.push("");
md.push("## Regla aplicada");
md.push("");
md.push("Para cada decisión P5 con `confidence=low`:");
md.push("");
md.push("1. Se buscan los pares con `confidence=high` en el mismo `(rama, título)`.");
md.push("2. Si hay un párrafo dominante (≥50% de los pares): se hereda ese párrafo.");
md.push("3. Si no hay mayoría: se asigna `${titulo}_P1` como fallback.");
md.push("");
md.push("En todos los casos la confianza se promueve a `medium` y `reasoning` recibe un prefijo `[PROMOTED ...]`.");
md.push("");
md.push("## Resumen");
md.push("");
md.push("| Métrica | Valor |");
md.push("|---------|------:|");
md.push(`| Total LOW promovidas | ${changes.length} |`);
md.push(`| Heredadas de vecinos high | ${peerCount} |`);
md.push(`| Fallback a P1 | ${fallbackCount} |`);
md.push("");
md.push("## Desglose por título");
md.push("");
md.push("| Rama | Título | Total | Peer-dominant | P1-fallback |");
md.push("|------|--------|------:|--------------:|------------:|");
for (const [k, v] of Object.entries(byTitulo).sort((a, b) => b[1].count - a[1].count)) {
  const [rama, titulo] = k.split("|");
  md.push(`| ${rama.replace("DERECHO_", "")} | \`${titulo}\` | ${v.count} | ${v.peer} | ${v.fallback} |`);
}
md.push("");
md.push("## Siguiente paso");
md.push("");
md.push("```bash");
md.push("# Previsualizar qué se aplicará (incluyendo medium):");
md.push("npx tsx scripts/fase5-apply.ts --include-medium");
md.push("");
md.push("# Aplicar a DB:");
md.push("npx tsx scripts/fase5-apply.ts --apply --include-medium");
md.push("```");
md.push("");
fs.writeFileSync(reportPath, md.join("\n"));
console.log(`Reporte → ${reportPath}`);

console.log("\n✓ Promoción completada. Ahora puedes correr:");
console.log("   npx tsx scripts/fase5-apply.ts --apply --include-medium");
