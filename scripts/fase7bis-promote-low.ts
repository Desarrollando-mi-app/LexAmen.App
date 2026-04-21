/**
 * Fase 7-bis — Promote LOW: determinístico, sin LLM
 * ──────────────────────────────────────────────────
 * Estrategia:
 *   - Las 75 rows con `confidence=low` ya tienen `target_titulo` y
 *     `target_libro` válidos (la heurística R8 los emparejó con
 *     keywords débiles). Se promueven a `medium` con una nota
 *     explicativa en `parrafo_note` para trazabilidad.
 *   - Las rows con `confidence=null` (73) se dejan tal cual: no hay
 *     título destino viable, el source mantiene `ramasAdicionales`
 *     intactas para que el filtro por rama siga funcionando.
 *
 * Fuente:  outputs/fase-7bis-plan.csv
 * Outputs: outputs/fase-7bis-plan.csv (reescrito, backup en .bak)
 *          outputs/fase-7bis-promote-report.md
 *
 * Uso:
 *   npx tsx scripts/fase7bis-promote-low.ts --dry  # solo reporta
 *   npx tsx scripts/fase7bis-promote-low.ts        # aplica
 */

import fs from "node:fs";
import path from "node:path";

const DRY = process.argv.includes("--dry");
const csvPath = path.join(process.cwd(), "outputs/fase-7bis-plan.csv");
const bakPath = path.join(process.cwd(), "outputs/fase-7bis-plan.csv.bak-promote");
const reportPath = path.join(process.cwd(), "outputs/fase-7bis-promote-report.md");

// ─── CSV parser/serializer ────────────────────────────────
function parseCSV(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQ = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQ) {
      if (ch === '"') {
        if (text[i + 1] === '"') { cell += '"'; i++; }
        else inQ = false;
      } else cell += ch;
    } else {
      if (ch === '"') inQ = true;
      else if (ch === ",") { row.push(cell); cell = ""; }
      else if (ch === "\n") { row.push(cell); lines.push(row); row = []; cell = ""; }
      else if (ch !== "\r") cell += ch;
    }
  }
  if (cell.length > 0 || row.length > 0) { row.push(cell); lines.push(row); }
  return lines;
}

function csvEscape(raw: unknown): string {
  const s = String(raw ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
}

const raw = fs.readFileSync(csvPath, "utf-8");
const rows = parseCSV(raw);
const header = rows[0];
const data = rows.slice(1).filter((r) => r.length > 1);

const idxConfidence = header.indexOf("confidence");
const idxTituloT = header.indexOf("target_titulo");
const idxLibroT = header.indexOf("target_libro");
const idxParrafoNote = header.indexOf("parrafo_note");

if (idxConfidence < 0 || idxTituloT < 0 || idxLibroT < 0 || idxParrafoNote < 0) {
  console.error("Header inesperado en CSV:", header);
  process.exit(1);
}

// ─── Stats + rewrite ──────────────────────────────────────
let promoted = 0;
let skippedNull = 0;
let alreadyOk = 0;
const byTargetRama: Record<string, number> = {};
const byTitulo: Record<string, number> = {};
const idxTargetRama = header.indexOf("target_rama");

const newRows: string[][] = [header];
for (const r of data) {
  const conf = r[idxConfidence];
  const hasTitulo = (r[idxTituloT] ?? "").trim().length > 0;
  const hasLibro = (r[idxLibroT] ?? "").trim().length > 0;

  if (conf === "low" && hasTitulo && hasLibro) {
    promoted++;
    byTargetRama[r[idxTargetRama]] = (byTargetRama[r[idxTargetRama]] ?? 0) + 1;
    const key = `${r[idxTargetRama]}|${r[idxTituloT]}`;
    byTitulo[key] = (byTitulo[key] ?? 0) + 1;
    const copy = [...r];
    copy[idxConfidence] = "medium";
    const prev = copy[idxParrafoNote] ?? "";
    copy[idxParrafoNote] = `[PROMOTED low→medium · R8 keyword match débil pero target_titulo válido] ${prev}`.slice(0, 500);
    newRows.push(copy);
  } else if (conf === "" || conf === "null") {
    skippedNull++;
    newRows.push(r);
  } else {
    alreadyOk++;
    newRows.push(r);
  }
}

console.log(`\n═══ Fase 7-bis · Promote LOW · ${DRY ? "DRY-RUN" : "APPLY"} ═══`);
console.log(`Rows totales: ${data.length}`);
console.log(`  · promovidas low→medium: ${promoted}`);
console.log(`  · ya high/medium: ${alreadyOk}`);
console.log(`  · null (sin título destino, se dejan con ramasAdicionales): ${skippedNull}`);
console.log();
console.log("Por target_rama (promovidas):");
for (const [k, v] of Object.entries(byTargetRama).sort((a, b) => b[1] - a[1])) {
  console.log(`  ${k}: ${v}`);
}

if (DRY) {
  console.log("\nDRY-RUN: no se escribió nada. Re-ejecuta sin --dry para aplicar.");
  process.exit(0);
}

// ─── Write ────────────────────────────────────────────────
fs.copyFileSync(csvPath, bakPath);
console.log(`\nBackup CSV → ${bakPath}`);
const out = newRows.map((r) => r.map(csvEscape).join(",")).join("\n");
fs.writeFileSync(csvPath, out);
console.log(`CSV actualizado → ${csvPath}`);

// ─── Report ───────────────────────────────────────────────
const md: string[] = [];
md.push("# Fase 7-bis · Promoción de LOW → MEDIUM");
md.push("");
md.push(`_Generado ${new Date().toISOString()}. Determinístico, sin LLM._`);
md.push("");
md.push("## Regla aplicada");
md.push("");
md.push("Las 75 rows con `confidence=low` tienen `target_titulo` y `target_libro` válidos — la heurística R8 las emparejó con keywords débiles pero el destino es plausible. Se promueven a `medium` para que `fase7bis-apply --apply` las recoja.");
md.push("");
md.push("Las 73 rows con `confidence=null` (sin `target_titulo`) se dejan tal cual. Su source row conserva `ramasAdicionales`, lo que garantiza que aparezcan en filtros cross-rama pero sin duplicación en la DB.");
md.push("");
md.push("## Resumen");
md.push("");
md.push("| Métrica | Valor |");
md.push("|---------|------:|");
md.push(`| Rows promovidas low→medium | ${promoted} |`);
md.push(`| Rows skipped (null titulo) | ${skippedNull} |`);
md.push("");
md.push("## Por target_rama (promovidas)");
md.push("");
md.push("| Target rama | Count |");
md.push("|---|---:|");
for (const [k, v] of Object.entries(byTargetRama).sort((a, b) => b[1] - a[1])) {
  md.push(`| ${k.replace("DERECHO_", "")} | ${v} |`);
}
md.push("");
md.push("## Top títulos destino (promovidos)");
md.push("");
md.push("| target_rama|target_titulo | Count |");
md.push("|---|---:|");
for (const [k, v] of Object.entries(byTitulo).sort((a, b) => b[1] - a[1]).slice(0, 20)) {
  md.push(`| \`${k}\` | ${v} |`);
}
md.push("");
md.push("## Siguiente paso");
md.push("");
md.push("```bash");
md.push("# Previsualizar:");
md.push("npx tsx scripts/fase7bis-apply.ts --dry-run");
md.push("");
md.push("# Aplicar a DB:");
md.push("npx tsx scripts/fase7bis-apply.ts");
md.push("```");
md.push("");
fs.writeFileSync(reportPath, md.join("\n"));
console.log(`Reporte → ${reportPath}`);
console.log("\n✓ Listo. Ahora:");
console.log("   npx tsx scripts/fase7bis-apply.ts --dry-run   # preview");
console.log("   npx tsx scripts/fase7bis-apply.ts             # apply");
