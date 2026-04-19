/**
 * Fase 5 — Dry-run: clasificación asistida por LLM
 * ─────────────────────────────────────────────────
 * Resuelve los 2 tipos de residuos que quedaron en Fases 3 y 4:
 *
 *   A) P5 residual de Fase 4 — titulo válido + parrafo NULL + titulo con parrafos
 *      → LLM elige 1 de N párrafos candidatos (o UNKNOWN).
 *
 *   B) R8/metadata de Fase 3 — titulo INVÁLIDO (genérico tipo LIBRO_IV)
 *      → LLM elige 1 de N títulos candidatos de la misma rama (y opcionalmente el parrafo).
 *
 * Se usa gpt-4o-mini (ya configurado en el proyecto).
 *
 * Flags:
 *   --sample N          → solo procesa N filas aleatorias (para test)
 *   --only-p5 | --only-r8 → solo un subconjunto
 *   --concurrency N     → concurrencia paralela (default 15)
 *
 * Uso:
 *   npx tsx scripts/fase5-dry-run.ts --sample 30
 *   npx tsx scripts/fase5-dry-run.ts              (full run)
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import { INTEGRADOR_TITULOS } from "../lib/integradores";
import OpenAI from "openai";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }
if (!process.env.OPENAI_API_KEY) { console.error("ERROR: OPENAI_API_KEY no encontrado"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Flags ───
const argv = process.argv.slice(2);
const sampleIdx = argv.indexOf("--sample");
const SAMPLE = sampleIdx >= 0 ? parseInt(argv[sampleIdx + 1] ?? "0", 10) : 0;
const ONLY_P5 = argv.includes("--only-p5");
const ONLY_R8 = argv.includes("--only-r8");
const concIdx = argv.indexOf("--concurrency");
const CONCURRENCY = concIdx >= 0 ? parseInt(argv[concIdx + 1] ?? "15", 10) : 15;

console.log(`Config: sample=${SAMPLE || "all"}, concurrency=${CONCURRENCY}, onlyP5=${ONLY_P5}, onlyR8=${ONLY_R8}`);

// ═══════════════════════════════════════════════════════════════
// Índices curriculum
// ═══════════════════════════════════════════════════════════════

interface ParrafoInfo { id: string; label: string; }
interface TituloInfo { id: string; label: string; parrafos: ParrafoInfo[]; }

const tituloFullIndex: Map<string, TituloInfo> = new Map();        // tituloId → info
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
const validTitulos = new Set(tituloFullIndex.keys());

// ─── Exclusiones ──────────────────────────────────────────
// Integradores marcados en Fase 3 con esIntegrador=true — son legítimos,
// NO se reclasifican (se mueven a dropdown separado en Fase 6).
// Lista compartida con lib/integradores.ts (single source of truth).
const INTEGRATOR_TITULOS = new Set<string>(INTEGRADOR_TITULOS);

// Metadata editorial (FORMATO_*, REVISTA, CITACION…) — Fase 3 los flaggeó.
// Dejan para triage editorial separado, NO pasan por LLM.
const METADATA_TITULOS = new Set([
  "FORMATO_A", "FORMATO_B", "FORMATO_C", "FORMATO_D", "FORMATO_DEBATE",
  "REVISTA", "PUBLICACION", "CITACION", "INTEGRACION",
  "Del debate formal", "Del TC", "Del Expediente Abierto",
  "De la Revista", "De la valoracion", "De las reglas editoriales",
  "Del Analisis de Fallos", "De los derechos patrimoniales",
]);

// ═══════════════════════════════════════════════════════════════
// Carga de candidatos
// ═══════════════════════════════════════════════════════════════

interface Candidate {
  kind: "P5" | "R8";
  model: string;
  id: string;
  rama: string;
  titulo: string;         // el titulo actual de la fila
  text: string;
}

async function loadCandidates(): Promise<Candidate[]> {
  const out: Candidate[] = [];

  const push = (kind: "P5" | "R8", model: string, id: string, rama: string, titulo: string, text: string) => {
    out.push({ kind, model, id, rama, titulo, text });
  };

  const models: Array<{
    name: string;
    titleField: "titulo" | "tituloMateria";
    text: (r: Record<string, unknown>) => string;
    fetchP5: () => Promise<Array<Record<string, unknown>>>;
    fetchR8: () => Promise<Array<Record<string, unknown>>>;
  }> = [
    {
      name: "flashcard", titleField: "titulo",
      text: (r) => `${r.front} ${r.back}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.flashcard.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, titulo: true, front: true, back: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.flashcard.findMany({ select: { id: true, rama: true, esIntegrador: true, titulo: true, front: true, back: true } }) as any,
    },
    {
      name: "mcq", titleField: "titulo",
      text: (r) => `${r.question} ${r.explanation ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.mCQ.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, titulo: true, question: true, explanation: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.mCQ.findMany({ select: { id: true, rama: true, esIntegrador: true, titulo: true, question: true, explanation: true } }) as any,
    },
    {
      name: "trueFalse", titleField: "titulo",
      text: (r) => `${r.statement} ${r.explanation ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.trueFalse.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, titulo: true, statement: true, explanation: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.trueFalse.findMany({ select: { id: true, rama: true, esIntegrador: true, titulo: true, statement: true, explanation: true } }) as any,
    },
    {
      name: "definicion", titleField: "titulo",
      text: (r) => `${r.concepto} ${r.definicion}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.definicion.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, titulo: true, concepto: true, definicion: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.definicion.findMany({ select: { id: true, rama: true, esIntegrador: true, titulo: true, concepto: true, definicion: true } }) as any,
    },
    {
      name: "fillBlank", titleField: "titulo",
      text: (r) => `${r.textoConBlancos} ${r.explicacion ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.fillBlank.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, titulo: true, textoConBlancos: true, explicacion: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.fillBlank.findMany({ select: { id: true, rama: true, esIntegrador: true, titulo: true, textoConBlancos: true, explicacion: true } }) as any,
    },
    {
      name: "errorIdentification", titleField: "titulo",
      text: (r) => `${r.textoConErrores} ${r.explicacionGeneral ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.errorIdentification.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, titulo: true, textoConErrores: true, explicacionGeneral: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.errorIdentification.findMany({ select: { id: true, rama: true, esIntegrador: true, titulo: true, textoConErrores: true, explicacionGeneral: true } }) as any,
    },
    {
      name: "orderSequence", titleField: "tituloMateria",
      text: (r) => `${r.titulo} ${r.instruccion ?? ""} ${r.explicacion ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.orderSequence.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, instruccion: true, explicacion: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.orderSequence.findMany({ select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, instruccion: true, explicacion: true } }) as any,
    },
    {
      name: "matchColumns", titleField: "tituloMateria",
      text: (r) => `${r.titulo} ${r.explicacion ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.matchColumns.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, explicacion: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.matchColumns.findMany({ select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, explicacion: true } }) as any,
    },
    {
      name: "casoPractico", titleField: "tituloMateria",
      text: (r) => `${r.titulo} ${r.hechos}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.casoPractico.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, hechos: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.casoPractico.findMany({ select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, hechos: true } }) as any,
    },
    {
      name: "dictadoJuridico", titleField: "tituloMateria",
      text: (r) => `${r.titulo} ${r.textoCompleto}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.dictadoJuridico.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, textoCompleto: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.dictadoJuridico.findMany({ select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, textoCompleto: true } }) as any,
    },
    {
      name: "timeline", titleField: "tituloMateria",
      text: (r) => `${r.titulo} ${r.explicacion ?? ""}`,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchP5: () => prisma.timeline.findMany({ where: { parrafo: null }, select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, explicacion: true } }) as any,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      fetchR8: () => prisma.timeline.findMany({ select: { id: true, rama: true, esIntegrador: true, tituloMateria: true, titulo: true, explicacion: true } }) as any,
    },
  ];

  for (const m of models) {
    console.log(`Cargando ${m.name}...`);
    if (!ONLY_R8) {
      const rows = await m.fetchP5();
      for (const r of rows) {
        if (r.esIntegrador === true) continue;           // integradores no se parrafean
        const titulo = (r[m.titleField] as string) ?? "";
        const info = tituloFullIndex.get(titulo);
        if (!info || info.parrafos.length === 0) continue; // no hay párrafos candidatos
        push("P5", m.name, r.id as string, String(r.rama), titulo, m.text(r));
      }
    }
    if (!ONLY_P5) {
      const rows = await m.fetchR8();
      for (const r of rows) {
        const titulo = (r[m.titleField] as string) ?? "";
        if (validTitulos.has(titulo)) continue;          // ya válido
        if (r.esIntegrador === true) continue;           // integrador legítimo — no tocar
        if (INTEGRATOR_TITULOS.has(titulo)) continue;    // back-stop por titulo
        if (METADATA_TITULOS.has(titulo)) continue;      // metadata — triage editorial
        push("R8", m.name, r.id as string, String(r.rama), titulo, m.text(r));
      }
    }
  }

  return out;
}

// ═══════════════════════════════════════════════════════════════
// LLM classification
// ═══════════════════════════════════════════════════════════════

interface Decision {
  kind: "P5" | "R8";
  chosenTitulo: string | null;   // solo R8
  chosenParrafo: string | null;
  confidence: "high" | "medium" | "low" | "unknown";
  reasoning: string;
}

function truncate(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max) + "…";
}

async function classifyP5(c: Candidate): Promise<Decision> {
  const info = tituloFullIndex.get(c.titulo)!;
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

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: 150,
    temperature: 0.1,
  });
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

  const resp = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "system", content: system }, { role: "user", content: user }],
    response_format: { type: "json_object" },
    max_tokens: 180,
    temperature: 0.1,
  });
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

// ─── Concurrencia (semaphore) ───
// Aborta limpio si OpenAI devuelve 429 RPD (requests-per-day agotadas).
// Las RPM (per-minute) se pueden reintentar esperando; las RPD NO tiene sentido
// seguir intentando hasta que resetee el día.
const RPD_ABORT = { triggered: false, firstError: "" };
async function runWithLimit<T, R>(items: T[], limit: number, fn: (x: T, idx: number) => Promise<R>, onProgress?: (done: number, total: number) => void): Promise<R[]> {
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
          // Detectar 429 RPD (per-day). No confundir con RPM (per-minute).
          if (/429/.test(msg) && /per day|RPD/i.test(msg) && !RPD_ABORT.triggered) {
            RPD_ABORT.triggered = true;
            RPD_ABORT.firstError = msg;
            console.error(`\n\n⛔ 429 RPD detectado — OpenAI agotó cuota diaria. Abortando para no perder tiempo.`);
            console.error(`   Primer error: ${msg.slice(0, 200)}`);
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
  let cands = await loadCandidates();
  console.log(`\nCandidatos totales: ${cands.length} (P5=${cands.filter((c) => c.kind === "P5").length} R8=${cands.filter((c) => c.kind === "R8").length})`);

  if (SAMPLE > 0 && SAMPLE < cands.length) {
    // Muestra estratificada por kind
    const p5s = cands.filter((c) => c.kind === "P5");
    const r8s = cands.filter((c) => c.kind === "R8");
    const pickCount = (arr: Candidate[], n: number) => {
      const out: Candidate[] = [];
      const taken = new Set<number>();
      while (out.length < n && taken.size < arr.length) {
        const i = Math.floor(Math.random() * arr.length);
        if (taken.has(i)) continue;
        taken.add(i);
        out.push(arr[i]);
      }
      return out;
    };
    const nP5 = Math.min(Math.ceil(SAMPLE / 2), p5s.length);
    const nR8 = Math.min(SAMPLE - nP5, r8s.length);
    cands = [...pickCount(p5s, nP5), ...pickCount(r8s, nR8)];
    console.log(`Muestra: ${cands.length} filas (P5=${nP5} R8=${nR8})`);
  }

  console.log(`\nLlamando LLM (concurrencia=${CONCURRENCY})…`);
  const lastLog = { t: Date.now() };
  const decisions = await runWithLimit(cands, CONCURRENCY, async (c) => {
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

  // Stats
  const statsByKind: Record<string, Record<string, number>> = { P5: {}, R8: {} };
  for (let i = 0; i < cands.length; i++) {
    const c = cands[i];
    const d = decisions[i];
    const conf = d.confidence;
    const assigned = c.kind === "P5" ? d.chosenParrafo : d.chosenTitulo;
    const bucket = assigned ? conf : "none";
    statsByKind[c.kind][bucket] = (statsByKind[c.kind][bucket] ?? 0) + 1;
  }

  // Backup JSON FIRST — si el CSV falla, al menos los resultados del LLM sobreviven.
  const outDir = path.join(process.cwd(), "outputs");
  fs.mkdirSync(outDir, { recursive: true });
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
    const d = decisions[i] ?? ({} as Partial<Decision>);
    lines.push([
      c.model, c.id, c.kind, c.rama, c.titulo,
      d.chosenTitulo ?? "", d.chosenParrafo ?? "",
      d.confidence ?? "unknown", d.reasoning ?? "",
    ].map(csvEscape).join(","));
  }
  fs.writeFileSync(csvPath, lines.join("\n"));
  console.log(`CSV → ${csvPath}`);

  // MD
  const mdPath = path.join(outDir, "fase-5-plan.md");
  const md: string[] = [];
  md.push("# Fase 5 — Plan de clasificación LLM (DRY-RUN)");
  md.push(""); md.push(`_Generado ${new Date().toISOString()}. Sin escrituras en DB._`); md.push("");
  md.push(`**Candidatos procesados: ${cands.length}**`);
  md.push(`- P5 (parrafo ambiguo): ${cands.filter((c) => c.kind === "P5").length}`);
  md.push(`- R8 (titulo inválido): ${cands.filter((c) => c.kind === "R8").length}`);
  md.push("");
  md.push("## Resultados por tipo y confianza");
  md.push("");
  md.push("| Tipo | Alta | Media | Baja | UNKNOWN | Sin asignar |");
  md.push("|------|-----:|------:|-----:|--------:|------------:|");
  for (const k of ["P5", "R8"]) {
    const s = statsByKind[k];
    const total = cands.filter((c) => c.kind === k).length;
    const unassigned = total - ((s.high ?? 0) + (s.medium ?? 0) + (s.low ?? 0));
    md.push(`| **${k}** | ${s.high ?? 0} | ${s.medium ?? 0} | ${s.low ?? 0} | ${s.unknown ?? 0} | ${unassigned} |`);
  }
  md.push("");
  md.push("## Muestras");
  md.push("");
  for (const k of ["P5", "R8"]) {
    md.push(`### ${k}`);
    md.push("");
    md.push("| Modelo | id | rama | old_titulo | → titulo | → parrafo | conf | razón |");
    md.push("|--------|----|------|-----------|----------|-----------|------|-------|");
    const sample: Array<{ c: Candidate; d: Decision }> = [];
    for (let i = 0; i < cands.length && sample.length < 20; i++) {
      if (cands[i].kind === k) sample.push({ c: cands[i], d: decisions[i] });
    }
    for (const { c, d } of sample) {
      md.push(`| ${c.model} | \`${c.id.slice(0, 8)}\` | ${c.rama.replace("DERECHO_", "")} | \`${c.titulo || "(null)"}\` | \`${d?.chosenTitulo ?? "—"}\` | \`${d?.chosenParrafo ?? "—"}\` | ${d?.confidence ?? "unknown"} | ${(d?.reasoning ?? "").slice(0, 80)} |`);
    }
    md.push("");
  }
  md.push("## Siguiente paso");
  md.push("");
  md.push("- Revisa el CSV.");
  md.push("- Si apruebas, corro `scripts/fase5-apply.ts` para aplicar solo filas con confianza **high** (y opcionalmente **medium**).");
  md.push("- Las **low**/**unknown** quedan marcadas como \"requieren revisión editorial\".");
  md.push("");
  fs.writeFileSync(mdPath, md.join("\n"));
  console.log(`MD  → ${mdPath}`);

  // Resumen consola
  console.log("\n═══ SUMMARY ═══");
  for (const k of ["P5", "R8"]) {
    const s = statsByKind[k];
    const total = cands.filter((c) => c.kind === k).length;
    console.log(`  ${k}: total=${total} high=${s.high ?? 0} medium=${s.medium ?? 0} low=${s.low ?? 0} unknown=${s.unknown ?? 0}`);
  }

  // Alerta explícita si hubo abort por RPD
  const errCount = decisions.filter((d): d is { error: string } =>
    typeof d === "object" && d !== null && "error" in d,
  ).length;
  if (RPD_ABORT.triggered) {
    console.log(`\n⚠️  Run INCOMPLETO: abortado por 429 RPD de OpenAI.`);
    console.log(`   Errores: ${errCount}/${cands.length} · Decisiones reales: ${cands.length - errCount}`);
    console.log(`   Relanza cuando resetee el tope diario (UTC midnight aprox).`);
    process.exitCode = 2;
  } else if (errCount > cands.length * 0.1) {
    console.log(`\n⚠️  ${errCount}/${cands.length} errores (${((errCount / cands.length) * 100).toFixed(1)}%). Revisa antes de aplicar.`);
  }
}

main()
  .then(async () => { await prisma.$disconnect(); })
  .catch(async (e) => { console.error("Fatal:", e); await prisma.$disconnect(); process.exit(1); });
