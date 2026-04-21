/**
 * Fase 5 — Resume: reintenta los candidatos que fallaron con 429 RPD
 * ─────────────────────────────────────────────────────────────────
 * El dry-run original (scripts/fase5-dry-run.ts) serializó cands+decisions
 * en outputs/fase-5-raw.json. De las 4361 filas, 4018 quedaron como
 * {error: "429 RPD"} porque agotó los 10k requests/día de gpt-4o-mini.
 *
 * Este script:
 *   1. Lee el raw JSON.
 *   2. Filtra los índices con `error` en la decisión.
 *   3. Reenvía solo esos al LLM (reusa classifyP5 / classifyR8 idénticos).
 *   4. Mergea las nuevas decisiones sobre las viejas (preserva las 343 buenas).
 *   5. Reescribe raw.json + fase-5-plan.csv + fase-5-plan.md.
 *
 * Si vuelve a pegar RPD, aborta limpio y marca solo lo que pudo procesar
 * — las demás quedan con error; otro resume las continuará.
 *
 * Uso:
 *   npx tsx scripts/fase5-resume.ts
 *   npx tsx scripts/fase5-resume.ts --concurrency 10
 *   npx tsx scripts/fase5-resume.ts --sample 20     (prueba con 20 primero)
 */

import { CURRICULUM } from "../lib/curriculum-data";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.OPENAI_API_KEY) { console.error("ERROR: OPENAI_API_KEY no encontrado"); process.exit(1); }

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Retry helper para 429 TPM (per-minute, no RPD) ───
// TPM rebota cuando se satura el límite de tokens/min (200k para tier 1).
// OpenAI incluye "try again in Xms" en el mensaje. Reintentamos hasta 4 veces
// con backoff basado en ese hint + jitter. RPD NO se reintenta.
async function withTpmRetry<T>(fn: () => Promise<T>): Promise<T> {
  // OJO: cada retry consume 1 RPD. Con tier 1 (10k RPD/día) y >1000 R8
  // pendientes que rebotan mucho en TPM, MAX_RETRIES alto quema RPD antes
  // de terminar. 2 retries + concurrencia baja (3-4) es el sweet-spot.
  const MAX_RETRIES = 2;
  let lastErr: unknown;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try { return await fn(); }
    catch (e) {
      lastErr = e;
      const msg = e instanceof Error ? e.message : String(e);
      // Si es RPD, propagar inmediatamente — no tiene sentido reintentar.
      if (/429/.test(msg) && /per day|RPD/i.test(msg)) throw e;
      // Si es 429 TPM/RPM, parsear el delay sugerido y reintentar
      if (/429/.test(msg) && /(per min|TPM|RPM)/i.test(msg)) {
        if (attempt === MAX_RETRIES) throw e;
        // "try again in 510ms" o "try again in 2.1s"
        const ms = msg.match(/try again in (\d+(?:\.\d+)?)(ms|s)/i);
        let delay = 1000;
        if (ms) {
          const val = parseFloat(ms[1]);
          delay = ms[2].toLowerCase() === "s" ? val * 1000 : val;
        }
        // Jitter + backoff progresivo
        delay = delay * (1 + attempt * 0.5) + Math.random() * 500;
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      // Otros errores: propagar sin reintentar
      throw e;
    }
  }
  throw lastErr;
}

// ─── Flags ───
const argv = process.argv.slice(2);
const concIdx = argv.indexOf("--concurrency");
const CONCURRENCY = concIdx >= 0 ? parseInt(argv[concIdx + 1] ?? "15", 10) : 15;
const sampleIdx = argv.indexOf("--sample");
const SAMPLE = sampleIdx >= 0 ? parseInt(argv[sampleIdx + 1] ?? "0", 10) : 0;
// --regen-only: no llama al LLM, solo reescribe CSV/MD desde raw.json existente
const REGEN_ONLY = argv.includes("--regen-only");

// ─── Tipos (mismos que dry-run) ───
interface ParrafoInfo { id: string; label: string; }
interface TituloInfo { id: string; label: string; parrafos: ParrafoInfo[]; }
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
  confidence: "high" | "medium" | "low" | "unknown";
  reasoning: string;
}
type DecisionOrError = Decision | { error: string };

function isError(d: unknown): d is { error: string } {
  return typeof d === "object" && d !== null && "error" in d && typeof (d as Record<string, unknown>).error === "string";
}

// ─── Índices curriculum (idéntico a dry-run) ───
const tituloFullIndex: Map<string, TituloInfo> = new Map();
const titulosByRama: Record<string, TituloInfo[]> = {};
for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
  titulosByRama[ramaKey] = [];
  for (const sec of rama.secciones) {
    for (const t of sec.titulos) {
      const info: TituloInfo = {
        id: t.id,
        label: t.label,
        parrafos: (t.parrafos ?? []).map((p) => ({ id: p.id, label: p.label })),
      };
      tituloFullIndex.set(t.id, info);
      titulosByRama[ramaKey].push(info);
    }
  }
}

// ─── LLM (idéntico a dry-run) ───
function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

async function classifyP5(c: Candidate): Promise<Decision> {
  const info = tituloFullIndex.get(c.titulo);
  if (!info) {
    return { kind: "P5", chosenTitulo: null, chosenParrafo: null, confidence: "unknown", reasoning: "titulo no encontrado en index" };
  }
  const choices = info.parrafos.map((p) => `- ${p.id}: ${p.label}`).join("\n");
  const text = truncate(c.text.trim(), 1200);

  const system = `Eres un experto en derecho civil y procesal civil chileno. Tu tarea es asignar un ejercicio a UN párrafo específico del Código, dentro de su título. Responde SIEMPRE en JSON.`;
  const user = `Ejercicio:
"""${text}"""

Título actual: ${c.titulo} — "${info.label}"

Párrafos candidatos (elige UNO):
${choices}

Si ninguno calza con claridad, responde parrafo="UNKNOWN".

JSON: {"parrafo":"<id>","confianza":"alta|media|baja|unknown","razon":"breve"}`;

  const resp = await withTpmRetry(() => openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: 150,
    temperature: 0.1,
  }));
  const raw = resp.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw); } catch { /* ignore */ }
  const parrafo = String(parsed.parrafo ?? "UNKNOWN");
  const conf = String(parsed.confianza ?? "unknown").toLowerCase();
  const confidence: Decision["confidence"] =
    conf.startsWith("alt") ? "high" : conf.startsWith("med") ? "medium" : conf.startsWith("baj") ? "low" : "unknown";
  const isValid = info.parrafos.some((p) => p.id === parrafo);
  return {
    kind: "P5",
    chosenTitulo: null,
    chosenParrafo: isValid ? parrafo : null,
    confidence: isValid ? confidence : "unknown",
    reasoning: String(parsed.razon ?? "").slice(0, 200),
  };
}

async function classifyR8(c: Candidate): Promise<Decision> {
  const candidates = titulosByRama[c.rama] ?? [];
  if (candidates.length === 0) {
    return { kind: "R8", chosenTitulo: null, chosenParrafo: null, confidence: "unknown", reasoning: "sin candidatos en rama" };
  }
  const choices = candidates.map((t) => `- ${t.id}: ${t.label}`).join("\n");
  const text = truncate(c.text.trim(), 1200);

  const system = `Eres un experto en derecho civil y procesal civil chileno. Tu tarea es asignar un ejercicio a UN título del Código en su rama. Si el título elegido tiene sub-párrafos, también elige uno. Responde SIEMPRE en JSON.`;
  const user = `Ejercicio:
"""${text}"""

Rama: ${c.rama}
Título actual (inválido): ${c.titulo}

Títulos candidatos (elige UNO):
${choices}

Si ninguno calza con claridad, responde titulo="UNKNOWN".

JSON: {"titulo":"<id>","parrafo":"<id>|null","confianza":"alta|media|baja|unknown","razon":"breve"}`;

  const resp = await withTpmRetry(() => openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: 180,
    temperature: 0.1,
  }));
  const raw = resp.choices[0]?.message?.content ?? "{}";
  let parsed: Record<string, unknown> = {};
  try { parsed = JSON.parse(raw); } catch { /* ignore */ }
  const titulo = String(parsed.titulo ?? "UNKNOWN");
  const parrafo = parsed.parrafo && parsed.parrafo !== "null" ? String(parsed.parrafo) : null;
  const conf = String(parsed.confianza ?? "unknown").toLowerCase();
  const confidence: Decision["confidence"] =
    conf.startsWith("alt") ? "high" : conf.startsWith("med") ? "medium" : conf.startsWith("baj") ? "low" : "unknown";
  const titInfo = tituloFullIndex.get(titulo);
  const isValidTit = !!titInfo;
  const isValidParr = parrafo && titInfo?.parrafos.some((p) => p.id === parrafo);
  return {
    kind: "R8",
    chosenTitulo: isValidTit ? titulo : null,
    chosenParrafo: isValidParr ? parrafo : null,
    confidence: isValidTit ? confidence : "unknown",
    reasoning: String(parsed.razon ?? "").slice(0, 200),
  };
}

// ─── Semaphore con RPD abort (idéntico a dry-run) ───
const RPD_ABORT = { triggered: false, firstError: "" };
async function runWithLimit<T, R>(items: T[], limit: number, fn: (x: T, idx: number) => Promise<R>, onProgress?: (done: number, total: number) => void): Promise<(R | { error: string })[]> {
  const results: (R | { error: string })[] = new Array(items.length);
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
          if (/429/.test(msg) && /per day|RPD/i.test(msg) && !RPD_ABORT.triggered) {
            RPD_ABORT.triggered = true;
            RPD_ABORT.firstError = msg;
            console.error(`\n\n⛔ 429 RPD detectado — abortando.`);
            console.error(`   ${msg.slice(0, 200)}`);
          }
          results[i] = { error: msg };
        }
        done++;
        if (onProgress) onProgress(done, items.length);
      }
    })());
  }
  await Promise.all(workers);
  return results;
}

// ─── Serialización (idéntico a dry-run) ───
function writeOutputs(cands: Candidate[], decisions: DecisionOrError[]) {
  const outDir = path.join(process.cwd(), "outputs");
  fs.mkdirSync(outDir, { recursive: true });

  // Raw JSON
  const backupPath = path.join(outDir, "fase-5-raw.json");
  fs.writeFileSync(backupPath, JSON.stringify({ cands, decisions }, null, 2));
  console.log(`Backup raw → ${backupPath}`);

  // CSV
  const csvPath = path.join(outDir, "fase-5-plan.csv");
  const csvEscape = (raw: unknown): string => {
    const s = String(raw ?? "");
    return s.includes(",") || s.includes('"') || s.includes("\n")
      ? `"${s.replace(/"/g, '""')}"`
      : s;
  };
  const lines: string[] = ["model,id,kind,rama,old_titulo,new_titulo,new_parrafo,confidence,reasoning"];
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    const raw = decisions[i];
    // Defensivo: si raw es undefined/null por cualquier razón, tratarlo como pendiente
    const d: Partial<Decision> =
      raw === undefined || raw === null ? {} :
      isError(raw) ? {} : raw;
    const reasoning =
      raw === undefined || raw === null ? "PENDING (no procesado)" :
      isError(raw) ? `ERROR: ${raw.error.slice(0, 100)}` :
      d.reasoning ?? "";
    lines.push([
      c.model, c.id, c.kind, c.rama, c.titulo,
      d.chosenTitulo ?? "", d.chosenParrafo ?? "",
      d.confidence ?? "unknown", reasoning,
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n"));
  console.log(`CSV → ${csvPath}`);

  // MD
  const statsByKind: Record<string, Record<string, number>> = { P5: {}, R8: {} };
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    const raw = decisions[i];
    if (raw === undefined || raw === null) {
      statsByKind[c.kind]["pending"] = (statsByKind[c.kind]["pending"] ?? 0) + 1;
      continue;
    }
    if (isError(raw)) { statsByKind[c.kind]["error"] = (statsByKind[c.kind]["error"] ?? 0) + 1; continue; }
    const conf = raw.confidence;
    const assigned = c.kind === "P5" ? raw.chosenParrafo : raw.chosenTitulo;
    const bucket = assigned ? conf : "none";
    statsByKind[c.kind][bucket] = (statsByKind[c.kind][bucket] ?? 0) + 1;
  }

  const mdPath = path.join(outDir, "fase-5-plan.md");
  const md: string[] = [];
  md.push("# Fase 5 — Plan de clasificación LLM (DRY-RUN · resumed)");
  md.push(""); md.push(`_Generado ${new Date().toISOString()}. Sin escrituras en DB._`); md.push("");
  md.push(`**Candidatos procesados: ${cands.length}**`);
  md.push(`- P5 (parrafo ambiguo): ${cands.filter((c) => c.kind === "P5").length}`);
  md.push(`- R8 (titulo inválido): ${cands.filter((c) => c.kind === "R8").length}`);
  md.push("");
  md.push("## Resultados por tipo y confianza");
  md.push("");
  md.push("| Tipo | Alta | Media | Baja | UNKNOWN | Sin asignar | Error |");
  md.push("|------|-----:|------:|-----:|--------:|------------:|------:|");
  for (const k of ["P5", "R8"]) {
    const s = statsByKind[k];
    const total = cands.filter((c) => c.kind === k).length;
    const errs = s.error ?? 0;
    const unassigned = total - ((s.high ?? 0) + (s.medium ?? 0) + (s.low ?? 0) + (s.unknown ?? 0) + errs + (s.none ?? 0));
    md.push(`| **${k}** | ${s.high ?? 0} | ${s.medium ?? 0} | ${s.low ?? 0} | ${s.unknown ?? 0} | ${(s.none ?? 0) + unassigned} | ${errs} |`);
  }
  md.push("");
  fs.writeFileSync(mdPath, md.join("\n"));
  console.log(`MD  → ${mdPath}`);

  return statsByKind;
}

// ═══════════════════════════════════════════════════════════════
// Main
// ═══════════════════════════════════════════════════════════════

async function main() {
  const rawPath = path.join(process.cwd(), "outputs", "fase-5-raw.json");
  if (!fs.existsSync(rawPath)) {
    console.error(`ERROR: no existe ${rawPath}. Corre primero scripts/fase5-dry-run.ts.`);
    process.exit(1);
  }
  const raw = JSON.parse(fs.readFileSync(rawPath, "utf8")) as { cands: Candidate[]; decisions: DecisionOrError[] };
  const cands = raw.cands;
  const decisions: DecisionOrError[] = raw.decisions;

  if (cands.length !== decisions.length) {
    console.error(`ERROR: mismatch cands=${cands.length} decisions=${decisions.length}`);
    process.exit(1);
  }

  // Índices a reprocesar
  let errorIdx: number[] = [];
  for (let i = 0; i < decisions.length; i++) if (isError(decisions[i])) errorIdx.push(i);

  console.log(`Raw: ${cands.length} cands / ${decisions.length} decisions`);
  console.log(`Exitosas previas: ${cands.length - errorIdx.length}`);
  console.log(`A reprocesar: ${errorIdx.length} (P5=${errorIdx.filter((i) => cands[i].kind === "P5").length} R8=${errorIdx.filter((i) => cands[i].kind === "R8").length})`);

  if (REGEN_ONLY) {
    console.log("--regen-only: saltando LLM, solo reescribiendo CSV/MD desde raw.json");
    const stats = writeOutputs(cands, decisions);
    console.log("\n═══ SUMMARY (global) ═══");
    for (const k of ["P5", "R8"]) {
      const s = stats[k];
      const total = cands.filter((c) => c.kind === k).length;
      console.log(`  ${k}: total=${total} high=${s.high ?? 0} medium=${s.medium ?? 0} low=${s.low ?? 0} unknown=${s.unknown ?? 0} error=${s.error ?? 0} pending=${s.pending ?? 0}`);
    }
    return;
  }

  if (errorIdx.length === 0) {
    console.log("Nada que reprocesar. Exit.");
    return;
  }

  if (SAMPLE > 0 && SAMPLE < errorIdx.length) {
    // Prueba rápida: primeros N errores (estratificados)
    const p5Err = errorIdx.filter((i) => cands[i].kind === "P5");
    const r8Err = errorIdx.filter((i) => cands[i].kind === "R8");
    const nP5 = Math.min(Math.ceil(SAMPLE / 2), p5Err.length);
    const nR8 = Math.min(SAMPLE - nP5, r8Err.length);
    errorIdx = [...p5Err.slice(0, nP5), ...r8Err.slice(0, nR8)];
    console.log(`Sample: ${errorIdx.length} filas (P5=${nP5} R8=${nR8})`);
  }

  const toProcess = errorIdx.map((i) => ({ i, c: cands[i] }));
  const t0 = Date.now();
  const lastLog = { t: Date.now() };

  console.log(`\nLlamando LLM (concurrencia=${CONCURRENCY})…`);
  const results = await runWithLimit(toProcess, CONCURRENCY, async ({ c }) => {
    return c.kind === "P5" ? classifyP5(c) : classifyR8(c);
  }, (done, total) => {
    const now = Date.now();
    if (now - lastLog.t > 3000 || done === total) {
      const pct = ((done / total) * 100).toFixed(1);
      const rate = done / ((now - t0) / 1000);
      const eta = (total - done) / rate;
      console.log(`  ${done}/${total} (${pct}%) ${rate.toFixed(1)} req/s · ETA ${eta.toFixed(0)}s`);
      lastLog.t = now;
    }
  });
  console.log(`Tiempo total: ${((Date.now() - t0) / 1000).toFixed(0)}s`);

  // Merge sobre el array original
  // CRÍTICO: NO sobreescribir con undefined. Cuando RPD_ABORT dispara, los
  // workers salen dejando results[k]=undefined. Hay que preservar el {error}
  // original para que otro resume los vuelva a agarrar.
  let mergedOk = 0, mergedErr = 0, mergedSkipped = 0;
  for (let k = 0; k < toProcess.length; k++) {
    const origIdx = toProcess[k].i;
    const r = results[k];
    if (r === undefined || r === null) {
      mergedSkipped++;  // no procesado por abort — dejar {error} original
      continue;
    }
    if (isError(r)) {
      decisions[origIdx] = r;
      mergedErr++;
    } else {
      decisions[origIdx] = r as Decision;
      mergedOk++;
    }
  }

  console.log(`Merge: ok=${mergedOk} err=${mergedErr} skipped=${mergedSkipped}`);

  const stats = writeOutputs(cands, decisions);

  console.log("\n═══ SUMMARY (global, todos los cands) ═══");
  for (const k of ["P5", "R8"]) {
    const s = stats[k];
    const total = cands.filter((c) => c.kind === k).length;
    console.log(`  ${k}: total=${total} high=${s.high ?? 0} medium=${s.medium ?? 0} low=${s.low ?? 0} unknown=${s.unknown ?? 0} error=${s.error ?? 0}`);
  }

  if (RPD_ABORT.triggered) {
    console.log(`\n⚠️  Run INCOMPLETO: abortado por 429 RPD.`);
    console.log(`   Relanza mañana (UTC midnight aprox) con este mismo script.`);
    process.exitCode = 2;
  }
}

main().catch((e) => { console.error("Fatal:", e); process.exit(1); });
