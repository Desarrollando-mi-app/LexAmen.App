/**
 * Cleanup LEY_17336 — Paso 1: clasificar los 115 registros vía LLM.
 *
 * Para cada registro con `libro='LEY_17336'` en los 11 modelos, envía el
 * front/pregunta/label al LLM y pide que lo asigne a uno de los títulos/párrafos
 * de la Ley 17.336 definidos en CURRICULUM.
 *
 * Output: outputs/cleanup-ley17336-classify.csv con columnas:
 *   modelo,id,contenido,titulo_actual,parrafo_actual,titulo_nuevo,parrafo_nuevo,motivo
 *
 * Paso 2 (aplicar): scripts/cleanup-ley17336-apply.ts
 *
 * Uso:
 *   npx tsx scripts/cleanup-ley17336-classify.ts
 */

import OpenAI from "openai";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true, override: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true, override: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }
if (!process.env.ANTHROPIC_API_KEY) { console.error("ERROR: ANTHROPIC_API_KEY no encontrado"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const llm = new OpenAI({
  baseURL: "https://api.anthropic.com/v1/",
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

const MODEL = "claude-haiku-4-5";
const CONCURRENCY = 2;
const THROTTLE_MS = 1200;
const MAX_RETRIES = 6;
const OUT_CSV = "outputs/cleanup-ley17336-classify.csv";

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Estructura válida (espejo de lib/curriculum-data.ts LEY_17336) ───
interface ValidTarget { titulo: string; parrafo: string | null; label: string; articulos: string }
const VALID_TARGETS: ValidTarget[] = [
  { titulo: "L17336_T1", parrafo: "L17336_T1_P1", label: "T.I §I Naturaleza y objeto de la protección. Definiciones", articulos: "Arts. 1–7" },
  { titulo: "L17336_T1", parrafo: "L17336_T1_P2", label: "T.I §II Sujetos del derecho", articulos: "Arts. 8–9" },
  { titulo: "L17336_T1", parrafo: "L17336_T1_P3", label: "T.I §III Duración de la protección", articulos: "Arts. 10–12" },
  { titulo: "L17336_T1", parrafo: "L17336_T1_P4", label: "T.I §IV Derecho moral", articulos: "Arts. 14–16" },
  { titulo: "L17336_T1", parrafo: "L17336_T1_P5", label: "T.I §V Derecho patrimonial, ejercicio y limitaciones", articulos: "Arts. 17–47" },
  { titulo: "L17336_T1", parrafo: "L17336_T1_P6", label: "T.I §VI Contrato de edición", articulos: "Arts. 48–55" },
  { titulo: "L17336_T1", parrafo: "L17336_T1_P7", label: "T.I §VII Contrato de representación", articulos: "Arts. 56–64" },
  { titulo: "L17336_T2", parrafo: null, label: "Título II: Derechos Conexos al Derecho de Autor", articulos: "Arts. 65–71I" },
  { titulo: "L17336_T3", parrafo: null, label: "Título III: De las Excepciones al Derecho de Autor", articulos: "Arts. 71A–71S" },
  { titulo: "L17336_T4", parrafo: null, label: "Título IV: Disposiciones Generales y Registro", articulos: "Arts. 72–78" },
  { titulo: "L17336_T5", parrafo: null, label: "Título V: Contravenciones y Sanciones", articulos: "Arts. 79–85" },
];
const VALID_KEYS = new Set(VALID_TARGETS.map((t) => `${t.titulo}|${t.parrafo ?? ""}`));

// ─── Modelos ───
const MODELOS: Array<{ nombre: string; client: any; tituloField: "titulo" | "tituloMateria"; contentFields: string[] }> = [
  { nombre: "Flashcard",           client: prisma.flashcard,           tituloField: "titulo",        contentFields: ["front", "back"] },
  { nombre: "MCQ",                 client: prisma.mCQ,                 tituloField: "titulo",        contentFields: ["pregunta"] },
  { nombre: "TrueFalse",           client: prisma.trueFalse,           tituloField: "titulo",        contentFields: ["afirmacion"] },
  { nombre: "Definicion",          client: prisma.definicion,          tituloField: "titulo",        contentFields: ["termino", "definicion"] },
  { nombre: "FillBlank",           client: prisma.fillBlank,           tituloField: "titulo",        contentFields: ["enunciado"] },
  { nombre: "ErrorIdentification", client: prisma.errorIdentification, tituloField: "titulo",        contentFields: ["textoOriginal"] },
  { nombre: "OrderSequence",       client: prisma.orderSequence,       tituloField: "tituloMateria", contentFields: ["titulo", "descripcion"] },
  { nombre: "MatchColumns",        client: prisma.matchColumns,        tituloField: "tituloMateria", contentFields: ["titulo", "descripcion"] },
  { nombre: "CasoPractico",        client: prisma.casoPractico,        tituloField: "tituloMateria", contentFields: ["titulo", "hechos"] },
  { nombre: "DictadoJuridico",     client: prisma.dictadoJuridico,     tituloField: "tituloMateria", contentFields: ["titulo", "textoCompleto"] },
  { nombre: "Timeline",            client: prisma.timeline,            tituloField: "tituloMateria", contentFields: ["titulo", "descripcion"] },
];

// ─── Prompt ───
const SYSTEM = `Eres un clasificador jurídico especializado en la Ley 17.336 de Chile sobre Propiedad Intelectual. Tu tarea: asignar un ejercicio a UNO de los títulos/párrafos de esa ley.

Títulos/párrafos válidos (asigna EXACTAMENTE uno):

${VALID_TARGETS.map((t, i) => `${i + 1}. titulo="${t.titulo}" parrafo=${t.parrafo ? `"${t.parrafo}"` : "null"} → ${t.label} (${t.articulos})`).join("\n")}

Reglas:
- Si el contenido trata sobre qué/quién protege la ley, obras protegidas o definiciones → L17336_T1_P1.
- Autor, titular, coautoría → L17336_T1_P2.
- Plazos de protección, dominio público → L17336_T1_P3.
- Derecho moral (paternidad, integridad, arrepentimiento) → L17336_T1_P4.
- Derecho patrimonial (reproducción, comunicación pública, distribución, transformación) → L17336_T1_P5.
- Contrato de edición → L17336_T1_P6.
- Contrato de representación teatral/audiovisual → L17336_T1_P7.
- Intérpretes, ejecutantes, productores fonogramas, organismos radiodifusión → L17336_T2.
- Cita, uso educativo, notice-and-takedown, fair-use-like, excepciones → L17336_T3.
- Registro, Departamento de Derechos Intelectuales, SCD, formalidades → L17336_T4.
- Delitos, infracciones, multas, acciones civiles/penales → L17336_T5.

Responde SOLO con JSON en este formato exacto:
{"titulo":"L17336_TX","parrafo":"L17336_TX_PY" o null,"motivo":"<frase breve 1 línea>"}`;

async function classifyOnce(content: string): Promise<string> {
  const user = `Contenido del ejercicio:\n\n${content}\n\nAsígnalo a un título/párrafo de la Ley 17.336.`;
  const r = await llm.chat.completions.create({
    model: MODEL,
    max_tokens: 200,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: user },
    ],
  });
  return r.choices[0]?.message?.content ?? "";
}

async function classify(content: string): Promise<{ titulo: string; parrafo: string | null; motivo: string } | null> {
  let text = "";
  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      text = await classifyOnce(content);
      break;
    } catch (e) {
      const msg = (e as Error).message ?? "";
      if (msg.includes("429") || msg.includes("rate limit")) {
        // Backoff exponencial ante 429: 3s → 6s → 12s → 24s → 48s → 96s
        const delay = 3000 * Math.pow(2, attempt);
        console.log(`    ⏳ 429 en intento ${attempt + 1}, esperando ${delay}ms…`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }
      throw e;
    }
  }
  if (!text) return null;
  // Limpieza: a veces viene con code fence.
  const cleaned = text.replace(/```json|```/g, "").trim();
  try {
    const parsed = JSON.parse(cleaned);
    const key = `${parsed.titulo}|${parsed.parrafo ?? ""}`;
    if (!VALID_KEYS.has(key)) {
      return { titulo: "L17336_T4", parrafo: null, motivo: `INVÁLIDO (${parsed.titulo}/${parsed.parrafo}) → fallback T4` };
    }
    return { titulo: parsed.titulo, parrafo: parsed.parrafo ?? null, motivo: parsed.motivo ?? "" };
  } catch {
    return { titulo: "L17336_T4", parrafo: null, motivo: `PARSE_ERROR: ${text.slice(0, 80)}` };
  }
}

// ─── Main ───
interface Item {
  modelo: string;
  id: string;
  content: string;
  titulo_actual: string | null;
  parrafo_actual: string | null;
}

async function collectItems(): Promise<Item[]> {
  const items: Item[] = [];
  for (const m of MODELOS) {
    const rows = await m.client.findMany({ where: { libro: "LEY_17336" } });
    for (const row of rows) {
      const content = m.contentFields
        .map((f) => (row[f] ? `[${f}] ${String(row[f]).slice(0, 400)}` : null))
        .filter(Boolean)
        .join("\n");
      items.push({
        modelo: m.nombre,
        id: row.id,
        content,
        titulo_actual: row[m.tituloField] ?? null,
        parrafo_actual: row.parrafo ?? null,
      });
    }
  }
  return items;
}

function csvEscape(s: string): string {
  if (s.includes('"') || s.includes(",") || s.includes("\n")) {
    return `"${s.replace(/"/g, '""').replace(/\n/g, " ")}"`;
  }
  return s;
}

async function main() {
  console.log("─── Cleanup LEY_17336 · Clasificación LLM ───\n");
  console.log(`Modelo: ${MODEL}, Concurrencia: ${CONCURRENCY}, Throttle: ${THROTTLE_MS}ms\n`);

  const items = await collectItems();
  console.log(`Total a clasificar: ${items.length}`);

  // Resume: lee CSV existente, salta IDs ya procesados.
  fs.mkdirSync(path.dirname(OUT_CSV), { recursive: true });
  const doneIds = new Set<string>();
  const existingLines: string[] = [];
  if (fs.existsSync(OUT_CSV)) {
    const raw = fs.readFileSync(OUT_CSV, "utf8").split("\n");
    for (let i = 0; i < raw.length; i++) {
      if (!raw[i].trim()) continue;
      if (i === 0) { existingLines.push(raw[i]); continue; }
      existingLines.push(raw[i]);
      // id está en columna 2 (modelo, id, …). Parser simple.
      const match = raw[i].match(/^[^,]*,([^,]+)/);
      if (match) doneIds.add(match[1]);
    }
    console.log(`Resume: ${doneIds.size} ya clasificados en CSV, faltan ${items.length - doneIds.size}.`);
  }
  const pending = items.filter((it) => !doneIds.has(it.id));
  console.log(`A procesar ahora: ${pending.length}\n`);

  const out: string[] = existingLines.length > 0
    ? existingLines
    : [["modelo", "id", "content_preview", "titulo_actual", "parrafo_actual", "titulo_nuevo", "parrafo_nuevo", "motivo"].map(csvEscape).join(",")];

  let done = 0;
  const queue = [...pending];
  // Escritura atómica incremental: persistimos después de cada clasificación.
  const flush = () => fs.writeFileSync(OUT_CSV, out.join("\n") + "\n", "utf8");

  await Promise.all(
    Array.from({ length: CONCURRENCY }, async () => {
      while (queue.length > 0) {
        const it = queue.shift();
        if (!it) break;
        try {
          const r = await classify(it.content);
          if (!r) {
            console.log(`  ✗ ${it.modelo}/${it.id} → NULL`);
            continue;
          }
          out.push([
            it.modelo, it.id, it.content.replace(/\s+/g, " ").slice(0, 200),
            it.titulo_actual ?? "", it.parrafo_actual ?? "",
            r.titulo, r.parrafo ?? "",
            r.motivo,
          ].map(csvEscape).join(","));
          done++;
          console.log(`  ✓ [${done}/${pending.length}] ${it.modelo.padEnd(22)} ${it.id.slice(0, 15)} → ${r.titulo}${r.parrafo ? `/${r.parrafo}` : ""}`);
          flush();
          if (THROTTLE_MS > 0) await new Promise((r) => setTimeout(r, THROTTLE_MS));
        } catch (e) {
          console.log(`  ✗ ${it.modelo}/${it.id} → ERROR ${(e as Error).message}`);
        }
      }
    }),
  );

  flush();
  console.log(`\n✓ CSV escrito: ${OUT_CSV}`);
  console.log(`\nPróximo paso: revisa el CSV, luego corre:`);
  console.log(`  npx tsx scripts/cleanup-ley17336-apply.ts --dry-run`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
