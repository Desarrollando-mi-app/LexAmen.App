/**
 * Fase 7 — Detect cross-rama: heurística de keywords.
 * ────────────────────────────────────────────────────
 * Para cada ejercicio en los modelos de alto volumen, mide cuántas keywords
 * distintivas de cada rama aparecen en su contenido. Si otra rama ≠ rama_asignada
 * cumple los umbrales, lo marca como candidato a cross-rama.
 *
 * Sin escrituras en DB. Output: outputs/fase-7-candidatos.csv (+ resumen md).
 *
 * Umbrales (ajustables por flag):
 *   --min-target-hits N    Mínimo de keywords ÚNICAS de la rama objetivo (default 2)
 *   --min-ratio X          target_hits / own_hits mínimo (default 0.6, si own_hits>0)
 *   --models "a,b,c"       Modelos a procesar (default: flashcard,mcq,trueFalse,definicion)
 *   --include-integradores Incluye integradores (default: excluidos)
 *
 * Uso:
 *   npx tsx scripts/fase7-detect.ts
 *   npx tsx scripts/fase7-detect.ts --min-target-hits 3 --min-ratio 0.7
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { countUniqueKeywords, RAMAS } from "../lib/rama-keywords";
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
const getArg = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const MIN_TARGET_HITS = parseInt(getArg("--min-target-hits", "2"), 10);
const MIN_RATIO = parseFloat(getArg("--min-ratio", "0.6"));
const MODELS_FLAG = getArg("--models", "flashcard,mcq,trueFalse,definicion").split(",");
const INCLUDE_INTEG = argv.includes("--include-integradores");

console.log(`Config: min-target-hits=${MIN_TARGET_HITS}, min-ratio=${MIN_RATIO}, models=${MODELS_FLAG.join(",")}, integradores=${INCLUDE_INTEG ? "incluidos" : "excluidos"}`);

// ─── Modelos con sus fields de contenido ───
interface ModelCfg {
  name: string;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  delegate: any;
  contentFields: string[];
  idField: string;
}
const MODELS: ModelCfg[] = [
  { name: "flashcard",           delegate: prisma.flashcard,            contentFields: ["front", "back"],                                                  idField: "id" },
  { name: "mcq",                 delegate: prisma.mCQ,                  contentFields: ["question", "optionA", "optionB", "optionC", "optionD", "explanation"], idField: "id" },
  { name: "trueFalse",           delegate: prisma.trueFalse,            contentFields: ["statement", "explanation"],                                       idField: "id" },
  { name: "definicion",          delegate: prisma.definicion,           contentFields: ["concepto", "definicion", "explicacion"],                          idField: "id" },
  { name: "fillBlank",           delegate: prisma.fillBlank,            contentFields: ["textoConBlancos", "explicacion"],                                 idField: "id" },
  { name: "errorIdentification", delegate: prisma.errorIdentification,  contentFields: ["segmentos"],                                                      idField: "id" },
  { name: "orderSequence",       delegate: prisma.orderSequence,        contentFields: ["titulo", "instruccion", "items"],                                 idField: "id" },
  { name: "matchColumns",        delegate: prisma.matchColumns,         contentFields: ["titulo", "instruccion", "pares", "explicacion"],                  idField: "id" },
  { name: "casoPractico",        delegate: prisma.casoPractico,         contentFields: ["titulo", "hechos", "preguntas", "resumenFinal"],                  idField: "id" },
  { name: "dictadoJuridico",     delegate: prisma.dictadoJuridico,      contentFields: ["titulo", "textoCompleto"],                                        idField: "id" },
  { name: "timeline",            delegate: prisma.timeline,             contentFields: ["titulo", "instruccion", "eventos"],                               idField: "id" },
];

interface Candidate {
  model: string;
  id: string;
  ownRama: string;
  ownHits: number;
  targetRama: string;
  targetHits: number;
  ratio: number;
  excerpt: string;
  // Breakdown de hits por rama (para auditoría)
  allHits: Record<string, number>;
}

const csvEscape = (raw: unknown): string => {
  const s = String(raw ?? "");
  return s.includes(",") || s.includes('"') || s.includes("\n")
    ? `"${s.replace(/"/g, '""')}"`
    : s;
};

async function processModel(cfg: ModelCfg): Promise<Candidate[]> {
  console.log(`\n── ${cfg.name} ──`);
  const where = INCLUDE_INTEG ? {} : { esIntegrador: false };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rows = await (cfg.delegate as any).findMany({ where });
  console.log(`  Filas: ${rows.length}${INCLUDE_INTEG ? "" : " (sin integradores)"}`);

  const candidates: Candidate[] = [];
  const ramaStats: Record<string, { own: number; cross: number }> = {};

  for (const row of rows) {
    const ownRama = row.rama;
    if (!ownRama) continue;
    if (!ramaStats[ownRama]) ramaStats[ownRama] = { own: 0, cross: 0 };
    ramaStats[ownRama].own++;

    // Concatena todos los contentFields a un string único
    const textParts: string[] = [];
    for (const f of cfg.contentFields) {
      const v = row[f];
      if (typeof v === "string" && v.length > 0) textParts.push(v);
    }
    const text = textParts.join(" ");
    if (text.length < 20) continue;

    const hits = countUniqueKeywords(text);
    const ownHits = hits[ownRama] ?? 0;

    for (const tRama of RAMAS) {
      if (tRama === ownRama) continue;
      const tHits = hits[tRama] ?? 0;
      if (tHits < MIN_TARGET_HITS) continue;
      // Si ownHits = 0, requiere más hits en el target (heurística más estricta)
      const effectiveMinRatio = ownHits === 0 ? 1.0 : MIN_RATIO;
      const ratio = ownHits === 0 ? (tHits >= MIN_TARGET_HITS + 1 ? 999 : 0) : tHits / ownHits;
      if (ratio < effectiveMinRatio) continue;

      candidates.push({
        model: cfg.name,
        id: row[cfg.idField],
        ownRama,
        ownHits,
        targetRama: tRama,
        targetHits: tHits,
        ratio: ratio === 999 ? ownHits : ratio,
        excerpt: text.slice(0, 200).replace(/\s+/g, " "),
        allHits: hits,
      });
      ramaStats[ownRama].cross++;
    }
  }

  for (const r of Object.keys(ramaStats)) {
    const s = ramaStats[r];
    const pct = s.own > 0 ? ((s.cross / s.own) * 100).toFixed(1) : "0";
    console.log(`  ${r.padEnd(22)} own=${s.own} cross-candidates=${s.cross} (${pct}%)`);
  }

  return candidates;
}

async function main() {
  const t0 = Date.now();
  const outDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const selected = MODELS.filter((m) => MODELS_FLAG.includes(m.name));
  if (selected.length === 0) {
    console.error(`Ningún modelo válido. Opciones: ${MODELS.map((m) => m.name).join(",")}`);
    process.exit(1);
  }

  const all: Candidate[] = [];
  for (const cfg of selected) {
    const cs = await processModel(cfg);
    all.push(...cs);
  }

  // Ordenar por (target_hits desc, ratio desc) para revisar los mejores primero
  all.sort((a, b) => b.targetHits - a.targetHits || b.ratio - a.ratio);

  // CSV
  const csvPath = path.join(outDir, "fase-7-candidatos.csv");
  const header = "model,id,own_rama,own_hits,target_rama,target_hits,ratio,excerpt,civil_hits,procesal_hits,organico_hits";
  const lines = [header];
  for (const c of all) {
    lines.push([
      c.model, c.id, c.ownRama, c.ownHits, c.targetRama, c.targetHits,
      c.ratio.toFixed(2), c.excerpt,
      c.allHits.DERECHO_CIVIL ?? 0,
      c.allHits.DERECHO_PROCESAL_CIVIL ?? 0,
      c.allHits.DERECHO_ORGANICO ?? 0,
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n"));

  // Markdown summary
  const mdPath = path.join(outDir, "fase-7-candidatos.md");
  const md: string[] = [
    "# Fase 7 — Candidatos cross-rama (detect heurístico)",
    "",
    `_Generado ${new Date().toISOString()}. min-target-hits=${MIN_TARGET_HITS}, min-ratio=${MIN_RATIO}._`,
    "",
    `**Total candidatos:** ${all.length}`,
    "",
    "## Matriz cross-rama (own → target)",
    "",
    "| own \\ target | CIVIL | PROC. CIVIL | ORGÁNICO |",
    "|---|---:|---:|---:|",
  ];
  const matrix: Record<string, Record<string, number>> = {};
  for (const c of all) {
    matrix[c.ownRama] ??= {};
    matrix[c.ownRama][c.targetRama] = (matrix[c.ownRama][c.targetRama] ?? 0) + 1;
  }
  for (const r of RAMAS) {
    const row = matrix[r] ?? {};
    md.push(`| ${r.replace("DERECHO_", "")} | ${row.DERECHO_CIVIL ?? 0} | ${row.DERECHO_PROCESAL_CIVIL ?? 0} | ${row.DERECHO_ORGANICO ?? 0} |`);
  }

  md.push("", "## Top 30 candidatos (más hits en target)", "");
  md.push("| Modelo | id | own | own_hits | target | t_hits | ratio | excerpt |");
  md.push("|---|---|---|---:|---|---:|---:|---|");
  for (const c of all.slice(0, 30)) {
    md.push(`| ${c.model} | \`${c.id.slice(0, 10)}\` | ${c.ownRama.replace("DERECHO_", "")} | ${c.ownHits} | ${c.targetRama.replace("DERECHO_", "")} | ${c.targetHits} | ${c.ratio.toFixed(1)} | ${c.excerpt.slice(0, 80)}… |`);
  }

  md.push("", "## Siguiente paso",
    "- Revisa visualmente el CSV (top 30 en este MD).",
    "- Si la precisión heurística se ve razonable, corre `scripts/fase7-rank.ts --provider ollama` (o `--provider openai`) para validar cada candidato con LLM.",
    "- El schema change (agregar `ramasAdicionales String[]`) se hace recién después del ranking LLM."
  );
  fs.writeFileSync(mdPath, md.join("\n"));

  console.log(`\nTiempo: ${((Date.now() - t0) / 1000).toFixed(1)}s`);
  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  Total candidatos: ${all.length}`);
  for (const r of RAMAS) {
    const row = matrix[r] ?? {};
    const total = Object.values(row).reduce((a, b) => a + b, 0);
    console.log(`  ${r.padEnd(24)} → cross total: ${total}`);
  }
  console.log(`\nCSV → ${csvPath}`);
  console.log(`MD  → ${mdPath}`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error("Fatal:", e); await prisma.$disconnect(); process.exit(1); });
