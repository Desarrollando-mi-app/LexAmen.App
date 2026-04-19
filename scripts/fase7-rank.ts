/**
 * Fase 7 — Rank LLM: valida candidatos cross-rama.
 * ─────────────────────────────────────────────────
 * Lee outputs/fase-7-candidatos.csv (producido por fase7-detect.ts), y para
 * cada candidato le pregunta al LLM si el ejercicio TAMBIÉN aplica a la rama
 * objetivo (además de la rama asignada actual). Respuesta estructurada JSON.
 *
 * Soporta dos proveedores mediante flag:
 *   --provider ollama   → localhost:11434 (default, gratis, sin rate limits)
 *   --provider openai   → OpenAI gpt-4o-mini (cuota RPD, cuesta ~$0.05/500 req)
 *
 * Otros flags:
 *   --model NAME           Modelo específico (default: qwen2.5:3b o gpt-4o-mini)
 *   --concurrency N        Concurrencia (default: ollama=3, openai=10)
 *   --sample N             Solo procesa N primeros candidatos (para smoke test)
 *   --input PATH           CSV alternativo (default: outputs/fase-7-candidatos.csv)
 *
 * Output: outputs/fase-7-rank-[provider].csv + .json backup + .md summary.
 *
 * Si OpenAI devuelve 429 RPD, aborta limpio (igual que fase5).
 */
import OpenAI from "openai";
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
const getArg = (name: string, def: string): string => {
  const i = argv.indexOf(name);
  return i >= 0 && argv[i + 1] ? argv[i + 1] : def;
};
const PROVIDER = (getArg("--provider", "ollama") as "ollama" | "openai");
const MODEL = getArg("--model", PROVIDER === "ollama" ? "qwen2.5:3b" : "gpt-4o-mini");
const CONCURRENCY = parseInt(getArg("--concurrency", PROVIDER === "ollama" ? "3" : "10"), 10);
const SAMPLE = parseInt(getArg("--sample", "0"), 10);
const INPUT = getArg("--input", "outputs/fase-7-candidatos.csv");

// ─── Cliente dual ───
let llm: OpenAI;
if (PROVIDER === "ollama") {
  llm = new OpenAI({ baseURL: "http://localhost:11434/v1", apiKey: "ollama" });
} else {
  if (!process.env.OPENAI_API_KEY) { console.error("ERROR: OPENAI_API_KEY no encontrado"); process.exit(1); }
  llm = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

console.log(`Config: provider=${PROVIDER}, model=${MODEL}, concurrency=${CONCURRENCY}, sample=${SAMPLE || "all"}, input=${INPUT}`);

// ═══════════════════════════════════════════════════════════════
// CSV parsing
// ═══════════════════════════════════════════════════════════════

interface Candidate {
  model: string;
  id: string;
  ownRama: string;
  ownHits: number;
  targetRama: string;
  targetHits: number;
  ratio: number;
  excerpt: string;
  civilHits: number;
  procesalHits: number;
  organicoHits: number;
}

function parseCSVLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (inQ) {
      if (c === '"' && line[i + 1] === '"') { cur += '"'; i++; }
      else if (c === '"') inQ = false;
      else cur += c;
    } else {
      if (c === ",") { out.push(cur); cur = ""; }
      else if (c === '"') inQ = true;
      else cur += c;
    }
  }
  out.push(cur);
  return out;
}

function loadCandidates(csvPath: string): Candidate[] {
  const txt = fs.readFileSync(csvPath, "utf-8");
  const lines = txt.trim().split("\n");
  const out: Candidate[] = [];
  for (let i = 1; i < lines.length; i++) {
    const f = parseCSVLine(lines[i]);
    out.push({
      model: f[0],
      id: f[1],
      ownRama: f[2],
      ownHits: parseInt(f[3], 10) || 0,
      targetRama: f[4],
      targetHits: parseInt(f[5], 10) || 0,
      ratio: parseFloat(f[6]) || 0,
      excerpt: f[7],
      civilHits: parseInt(f[8], 10) || 0,
      procesalHits: parseInt(f[9], 10) || 0,
      organicoHits: parseInt(f[10], 10) || 0,
    });
  }
  return out;
}

// ═══════════════════════════════════════════════════════════════
// Extracción de contenido completo del ejercicio para mejor prompt
// ═══════════════════════════════════════════════════════════════

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function fetchContent(model: string, id: string): Promise<string> {
  const fields: Record<string, string[]> = {
    flashcard: ["front", "back", "titulo"],
    mcq: ["question", "optionA", "optionB", "optionC", "optionD", "explanation"],
    trueFalse: ["statement", "explanation"],
    definicion: ["concepto", "definicion", "explicacion"],
    fillBlank: ["textoConBlancos", "explicacion"],
    errorIdentification: ["segmentos"],
    orderSequence: ["titulo", "instruccion"],
    matchColumns: ["titulo", "instruccion", "explicacion"],
    casoPractico: ["titulo", "hechos", "resumenFinal"],
    dictadoJuridico: ["titulo", "textoCompleto"],
    timeline: ["titulo", "instruccion"],
  };
  const delegateMap: Record<string, unknown> = {
    flashcard: prisma.flashcard,
    mcq: prisma.mCQ,
    trueFalse: prisma.trueFalse,
    definicion: prisma.definicion,
    fillBlank: prisma.fillBlank,
    errorIdentification: prisma.errorIdentification,
    orderSequence: prisma.orderSequence,
    matchColumns: prisma.matchColumns,
    casoPractico: prisma.casoPractico,
    dictadoJuridico: prisma.dictadoJuridico,
    timeline: prisma.timeline,
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = delegateMap[model] as any;
  if (!d) return "";
  const row = await d.findUnique({ where: { id } });
  if (!row) return "";
  const parts: string[] = [];
  for (const f of fields[model] ?? []) {
    const v = row[f];
    if (typeof v === "string" && v.length) parts.push(`${f}: ${v}`);
  }
  return parts.join("\n").slice(0, 1500);
}

// ═══════════════════════════════════════════════════════════════
// LLM ranking
// ═══════════════════════════════════════════════════════════════

const ramaHuman = (r: string): string => ({
  DERECHO_CIVIL: "Derecho Civil (Código Civil)",
  DERECHO_PROCESAL_CIVIL: "Derecho Procesal Civil (CPC)",
  DERECHO_ORGANICO: "Derecho Orgánico (COT)",
}[r] ?? r);

const SYSTEM = `Eres un experto en derecho chileno. Tu tarea: decidir si un ejercicio de estudio jurídico, actualmente clasificado en UNA rama, TAMBIÉN debería aplicar a OTRA rama indicada (cross-rama).

Criterio:
- "aplica=true" si el ejercicio trata un tema que sustancialmente pertenece a ambas ramas (ej: prescripción adquisitiva aparece tanto en CC como en CPC por la reivindicatoria; receptores y notificaciones están tanto en COT como en CPC).
- "aplica=false" si el ejercicio está correctamente clasificado solo en su rama original y solo menciona la otra rama de pasada, sin sustancia.
- "confidence": "high" cuando estás seguro; "medium" con algo de ambigüedad; "low" si es dudoso.

Responde SOLO JSON válido, sin markdown: {"aplica":bool,"confidence":"high"|"medium"|"low","razon":"..."}
Razón: máximo 150 caracteres, en español.`;

interface Decision {
  aplica: boolean;
  confidence: "high" | "medium" | "low" | "unknown";
  razon: string;
}

async function classify(c: Candidate): Promise<Decision> {
  const content = await fetchContent(c.model, c.id);
  const user = `Ejercicio (modelo ${c.model}, actualmente en ${ramaHuman(c.ownRama)}):

${content}

¿Este ejercicio aplica también a ${ramaHuman(c.targetRama)}?`;

  const resp = await llm.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
    temperature: 0,
    response_format: { type: "json_object" },
  });

  const txt = resp.choices[0]?.message?.content ?? "{}";
  let parsed: { aplica?: unknown; confidence?: unknown; razon?: unknown } = {};
  try { parsed = JSON.parse(txt); } catch { parsed = {}; }

  const rawConf = String(parsed.confidence ?? "").toLowerCase();
  const confidence: Decision["confidence"] =
    rawConf === "high" || rawConf === "medium" || rawConf === "low"
      ? (rawConf as Decision["confidence"])
      : "unknown";

  return {
    aplica: parsed.aplica === true,
    confidence,
    razon: String(parsed.razon ?? "").slice(0, 200),
  };
}

// ─── Concurrencia + abort RPD ───
const RPD_ABORT = { triggered: false, firstError: "" };
async function runWithLimit<T, R>(
  items: T[], limit: number, fn: (x: T, i: number) => Promise<R>,
  onProgress?: (done: number, total: number) => void,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let idx = 0, done = 0;
  const workers: Promise<void>[] = [];
  for (let w = 0; w < Math.min(limit, items.length); w++) {
    workers.push((async () => {
      while (true) {
        if (RPD_ABORT.triggered) return;
        const i = idx++;
        if (i >= items.length) return;
        try { results[i] = await fn(items[i], i); }
        catch (e) {
          const msg = e instanceof Error ? e.message : String(e);
          if (PROVIDER === "openai" && /429/.test(msg) && /per day|RPD/i.test(msg) && !RPD_ABORT.triggered) {
            RPD_ABORT.triggered = true;
            RPD_ABORT.firstError = msg;
            console.error(`\n⛔ 429 RPD. Abortando.`);
          }
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          results[i] = { error: msg } as any;
        }
        done++;
        if (onProgress) onProgress(done, items.length);
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const t0 = Date.now();
  const cands = loadCandidates(INPUT);
  console.log(`Candidatos cargados: ${cands.length}`);

  const selected = SAMPLE > 0 && SAMPLE < cands.length ? cands.slice(0, SAMPLE) : cands;
  console.log(`Procesando: ${selected.length}`);

  const lastLog = { t: Date.now() };
  const decisions = await runWithLimit(selected, CONCURRENCY, classify, (done, total) => {
    const now = Date.now();
    if (now - lastLog.t > 3000 || done === total) {
      const pct = ((done / total) * 100).toFixed(1);
      const rate = done / ((now - t0) / 1000);
      const eta = rate > 0 ? Math.round((total - done) / rate) : 0;
      console.log(`  ${done}/${total} (${pct}%) ${rate.toFixed(1)} req/s · ETA ${eta}s`);
      lastLog.t = now;
    }
  });

  console.log(`Tiempo total: ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // ─── Output ───
  const outDir = path.join(process.cwd(), "outputs");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  const suffix = `-${PROVIDER}`;
  const jsonPath = path.join(outDir, `fase-7-rank${suffix}.json`);
  const csvPath = path.join(outDir, `fase-7-rank${suffix}.csv`);
  const mdPath = path.join(outDir, `fase-7-rank${suffix}.md`);

  // Backup raw antes de CSV (por si crashea)
  fs.writeFileSync(jsonPath, JSON.stringify({ cands: selected, decisions }, null, 2));

  const csvEscape = (raw: unknown): string => {
    const s = String(raw ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };

  const csvLines = ["model,id,own_rama,target_rama,aplica,confidence,razon"];
  for (let i = 0; i < selected.length; i++) {
    const c = selected[i];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = (decisions[i] ?? {}) as any;
    csvLines.push([
      c.model, c.id, c.ownRama, c.targetRama,
      d.aplica ?? "",
      d.confidence ?? "",
      d.razon ?? d.error ?? "",
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, csvLines.join("\n"));

  // ─── Stats ───
  const stats = {
    total: selected.length,
    aplicaTrue: { high: 0, medium: 0, low: 0, unknown: 0 },
    aplicaFalse: { high: 0, medium: 0, low: 0, unknown: 0 },
    errors: 0,
  };
  for (let i = 0; i < selected.length; i++) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = decisions[i] as any;
    if (!d || d.error) { stats.errors++; continue; }
    const bucket = d.aplica ? stats.aplicaTrue : stats.aplicaFalse;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (bucket as any)[d.confidence ?? "unknown"]++;
  }

  const md: string[] = [
    `# Fase 7 — Ranking LLM (${PROVIDER}, ${MODEL})`,
    "",
    `_Generado ${new Date().toISOString()}. Duración ${((Date.now() - t0) / 1000).toFixed(0)}s._`,
    "",
    `**Total:** ${stats.total} · **Errores:** ${stats.errors}`,
    "",
    "## Distribución",
    "",
    "| Decisión | HIGH | MEDIUM | LOW | UNKNOWN |",
    "|---|---:|---:|---:|---:|",
    `| aplica=true | ${stats.aplicaTrue.high} | ${stats.aplicaTrue.medium} | ${stats.aplicaTrue.low} | ${stats.aplicaTrue.unknown} |`,
    `| aplica=false | ${stats.aplicaFalse.high} | ${stats.aplicaFalse.medium} | ${stats.aplicaFalse.low} | ${stats.aplicaFalse.unknown} |`,
    "",
    "## Top 20 (aplica=true high)",
    "",
    "| Modelo | id | own → target | razón |",
    "|---|---|---|---|",
  ];

  const topTrue = selected
    .map((c, i) => ({ c, d: decisions[i] as Decision }))
    .filter((x) => x.d && !("error" in x.d) && x.d.aplica && x.d.confidence === "high")
    .slice(0, 20);
  for (const { c, d } of topTrue) {
    md.push(`| ${c.model} | \`${c.id.slice(0, 10)}\` | ${c.ownRama.replace("DERECHO_", "")} → ${c.targetRama.replace("DERECHO_", "")} | ${d.razon.slice(0, 120)} |`);
  }

  if (RPD_ABORT.triggered) {
    md.unshift("⚠️ **Run INCOMPLETO** — abortado por 429 RPD de OpenAI.", "");
  }

  fs.writeFileSync(mdPath, md.join("\n"));

  console.log(`\n═══ SUMMARY ═══`);
  console.log(`  aplica=true:  high=${stats.aplicaTrue.high} medium=${stats.aplicaTrue.medium} low=${stats.aplicaTrue.low}`);
  console.log(`  aplica=false: high=${stats.aplicaFalse.high} medium=${stats.aplicaFalse.medium} low=${stats.aplicaFalse.low}`);
  console.log(`  errores: ${stats.errors}`);
  console.log(`\nJSON → ${jsonPath}`);
  console.log(`CSV  → ${csvPath}`);
  console.log(`MD   → ${mdPath}`);

  if (RPD_ABORT.triggered) {
    console.log(`\n⚠️  Run INCOMPLETO por 429 RPD. Relanza mañana.`);
    process.exitCode = 2;
  }

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error("Fatal:", e); await prisma.$disconnect(); process.exit(1); });
