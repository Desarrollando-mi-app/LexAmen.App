/**
 * Catastro de Cobertura de Contenido — Studio Iuris
 *
 * Recorre el Índice Maestro (lib/curriculum-data.ts) y para cada título
 * atómico cuenta ejercicios en los 11 modelos de contenido educativo.
 *
 * Salida: outputs/catastro_contenido.md (sobrescribe).
 *
 * Uso: npx tsx scripts/catastro-cobertura.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  dotenv.config({ path: ".env" });
}

const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;

if (!connectionString) {
  console.error(
    "ERROR: No se encontró DIRECT_URL ni DATABASE_URL en .env.local/.env"
  );
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Tipos ───────────────────────────────────────────────

type RamaKey = keyof typeof CURRICULUM;

interface TituloCount {
  id: string;
  label: string;
  rama: string;
  libro: string;
  flashcard: number;
  mcq: number;
  trueFalse: number;
  definicion: number;
  fillBlank: number;
  errorIdentification: number;
  orderSequence: number;
  matchColumns: number;
  casoPractico: number;
  dictadoJuridico: number;
  timeline: number;
  total: number;
}

interface ModelRow {
  rama: string;
  libro: string | null;
  key: string | null; // titulo o tituloMateria
}

const MODEL_LABELS: Record<string, string> = {
  flashcard: "FC",
  mcq: "MCQ",
  trueFalse: "V/F",
  definicion: "Def",
  fillBlank: "Fill",
  errorIdentification: "Err",
  orderSequence: "Ord",
  matchColumns: "Match",
  casoPractico: "Caso",
  dictadoJuridico: "Dict",
  timeline: "TL",
};

const RAMA_LABEL: Record<string, string> = {
  DERECHO_CIVIL: "Civil",
  DERECHO_PROCESAL_CIVIL: "Procesal",
  DERECHO_ORGANICO: "Orgánico",
};

// ─── Helpers de agregación ───────────────────────────────

type BucketMap = Map<string, Map<string, number>>; // rama → (tituloKey → count)

function addRow(map: BucketMap, rama: string, key: string | null) {
  if (!key) return;
  let inner = map.get(rama);
  if (!inner) {
    inner = new Map();
    map.set(rama, inner);
  }
  inner.set(key, (inner.get(key) ?? 0) + 1);
}

function countBy(map: BucketMap, rama: string, key: string): number {
  return map.get(rama)?.get(key) ?? 0;
}

function totalFromMap(map: BucketMap): number {
  let t = 0;
  for (const inner of map.values()) {
    for (const v of inner.values()) t += v;
  }
  return t;
}

function totalByRama(map: BucketMap, rama: string): number {
  const inner = map.get(rama);
  if (!inner) return 0;
  let t = 0;
  for (const v of inner.values()) t += v;
  return t;
}

// ─── Carga de datos ──────────────────────────────────────

async function loadAllModels() {
  console.log("Cargando conteos desde la base de datos...");

  const [
    flashcards,
    mcqs,
    trueFalses,
    definiciones,
    fillBlanks,
    errorIds,
    orderSeqs,
    matchCols,
    casos,
    dictados,
    timelines,
  ] = await Promise.all([
    prisma.flashcard.findMany({
      select: { rama: true, libro: true, titulo: true },
    }),
    prisma.mCQ.findMany({
      select: { rama: true, libro: true, titulo: true },
    }),
    prisma.trueFalse.findMany({
      select: { rama: true, libro: true, titulo: true },
    }),
    prisma.definicion.findMany({
      select: { rama: true, libro: true, titulo: true },
    }),
    prisma.fillBlank.findMany({
      select: { rama: true, libro: true, titulo: true },
    }),
    prisma.errorIdentification.findMany({
      select: { rama: true, libro: true, titulo: true },
    }),
    prisma.orderSequence.findMany({
      select: { rama: true, libro: true, tituloMateria: true },
    }),
    prisma.matchColumns.findMany({
      select: { rama: true, libro: true, tituloMateria: true },
    }),
    prisma.casoPractico.findMany({
      select: { rama: true, libro: true, tituloMateria: true },
    }),
    prisma.dictadoJuridico.findMany({
      select: { rama: true, libro: true, tituloMateria: true },
    }),
    prisma.timeline.findMany({
      select: { rama: true, libro: true, tituloMateria: true },
    }),
  ]);

  const buckets: Record<string, BucketMap> = {
    flashcard: new Map(),
    mcq: new Map(),
    trueFalse: new Map(),
    definicion: new Map(),
    fillBlank: new Map(),
    errorIdentification: new Map(),
    orderSequence: new Map(),
    matchColumns: new Map(),
    casoPractico: new Map(),
    dictadoJuridico: new Map(),
    timeline: new Map(),
  };

  const rawCounts: Record<string, number> = {
    flashcard: flashcards.length,
    mcq: mcqs.length,
    trueFalse: trueFalses.length,
    definicion: definiciones.length,
    fillBlank: fillBlanks.length,
    errorIdentification: errorIds.length,
    orderSequence: orderSeqs.length,
    matchColumns: matchCols.length,
    casoPractico: casos.length,
    dictadoJuridico: dictados.length,
    timeline: timelines.length,
  };

  for (const r of flashcards)
    addRow(buckets.flashcard, String(r.rama), r.titulo);
  for (const r of mcqs) addRow(buckets.mcq, String(r.rama), r.titulo);
  for (const r of trueFalses)
    addRow(buckets.trueFalse, String(r.rama), r.titulo);
  for (const r of definiciones)
    addRow(buckets.definicion, String(r.rama), r.titulo);
  for (const r of fillBlanks)
    addRow(buckets.fillBlank, String(r.rama), r.titulo);
  for (const r of errorIds)
    addRow(buckets.errorIdentification, String(r.rama), r.titulo);
  for (const r of orderSeqs)
    addRow(buckets.orderSequence, String(r.rama), r.tituloMateria);
  for (const r of matchCols)
    addRow(buckets.matchColumns, String(r.rama), r.tituloMateria);
  for (const r of casos)
    addRow(buckets.casoPractico, String(r.rama), r.tituloMateria);
  for (const r of dictados)
    addRow(buckets.dictadoJuridico, String(r.rama), r.tituloMateria);
  for (const r of timelines)
    addRow(buckets.timeline, String(r.rama), r.tituloMateria);

  return { buckets, rawCounts };
}

// ─── Detección de keys huérfanas ─────────────────────────

function detectOrphanKeys(buckets: Record<string, BucketMap>) {
  const validByRama = new Map<string, Set<string>>();
  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    const set = new Set<string>();
    for (const sec of rama.secciones) {
      for (const t of sec.titulos) set.add(t.id);
    }
    validByRama.set(ramaKey, set);
  }

  const orphans: Array<{
    model: string;
    rama: string;
    key: string;
    count: number;
  }> = [];

  for (const [modelName, map] of Object.entries(buckets)) {
    for (const [rama, inner] of map.entries()) {
      const valid = validByRama.get(rama);
      for (const [key, count] of inner.entries()) {
        if (!valid || !valid.has(key)) {
          orphans.push({ model: modelName, rama, key, count });
        }
      }
    }
  }

  return orphans;
}

// ─── Construcción del catastro por título ────────────────

function buildTituloCounts(
  buckets: Record<string, BucketMap>
): TituloCount[] {
  const result: TituloCount[] = [];
  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    for (const sec of rama.secciones) {
      for (const t of sec.titulos) {
        const flashcard = countBy(buckets.flashcard, ramaKey, t.id);
        const mcq = countBy(buckets.mcq, ramaKey, t.id);
        const trueFalse = countBy(buckets.trueFalse, ramaKey, t.id);
        const definicion = countBy(buckets.definicion, ramaKey, t.id);
        const fillBlank = countBy(buckets.fillBlank, ramaKey, t.id);
        const errorIdentification = countBy(
          buckets.errorIdentification,
          ramaKey,
          t.id
        );
        const orderSequence = countBy(buckets.orderSequence, ramaKey, t.id);
        const matchColumns = countBy(buckets.matchColumns, ramaKey, t.id);
        const casoPractico = countBy(buckets.casoPractico, ramaKey, t.id);
        const dictadoJuridico = countBy(
          buckets.dictadoJuridico,
          ramaKey,
          t.id
        );
        const timeline = countBy(buckets.timeline, ramaKey, t.id);

        const total =
          flashcard +
          mcq +
          trueFalse +
          definicion +
          fillBlank +
          errorIdentification +
          orderSequence +
          matchColumns +
          casoPractico +
          dictadoJuridico +
          timeline;

        result.push({
          id: t.id,
          label: t.label,
          rama: ramaKey,
          libro: sec.libro,
          flashcard,
          mcq,
          trueFalse,
          definicion,
          fillBlank,
          errorIdentification,
          orderSequence,
          matchColumns,
          casoPractico,
          dictadoJuridico,
          timeline,
          total,
        });
      }
    }
  }
  return result;
}

// ─── Emisión del Markdown ────────────────────────────────

function truncate(s: string, n: number): string {
  if (s.length <= n) return s;
  return s.slice(0, n - 1) + "…";
}

function emitMarkdown(
  titulos: TituloCount[],
  rawCounts: Record<string, number>,
  orphans: Array<{
    model: string;
    rama: string;
    key: string;
    count: number;
  }>
): string {
  const today = new Date().toISOString().slice(0, 10);
  const total = titulos.reduce((acc, t) => acc + t.total, 0);
  const cubiertos = titulos.filter((t) => t.total > 0).length;
  const totalTitulos = titulos.length;
  const coveragePct =
    totalTitulos > 0 ? Math.round((cubiertos / totalTitulos) * 100) : 0;

  const ramas = Object.keys(CURRICULUM);
  const ramasActivas = ramas.filter((r) =>
    titulos.some((t) => t.rama === r && t.total > 0)
  );

  const lines: string[] = [];
  lines.push(`# Catastro de Contenido — Studio Iuris`);
  lines.push(`## Auditoría generada el ${today}`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Resumen Ejecutivo");
  lines.push("");
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---------|-------|`);
  lines.push(`| Total ejercicios | ${total.toLocaleString("es-CL")} |`);
  lines.push(`| Módulos activos | 11 |`);
  lines.push(`| Ramas con contenido | ${ramasActivas.length}/${ramas.length} |`);
  lines.push(
    `| Títulos cubiertos | ${cubiertos}/${totalTitulos} |`
  );
  lines.push(`| Cobertura Índice Maestro | ${coveragePct}% |`);
  lines.push(
    `| Keys huérfanas (no matchean currículum) | ${orphans.length} |`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Tabla por módulo × rama
  lines.push("## Contenido por Módulo");
  lines.push("");
  const moduleKeys = [
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
  ] as const;

  const moduleLabels: Record<(typeof moduleKeys)[number], string> = {
    flashcard: "Flashcards",
    mcq: "MCQ",
    trueFalse: "V/F",
    definicion: "Definiciones",
    fillBlank: "FillBlank",
    errorIdentification: "ErrorId",
    orderSequence: "OrderSeq",
    matchColumns: "MatchCol",
    casoPractico: "CasoPractico",
    dictadoJuridico: "Dictado",
    timeline: "Timeline",
  };

  // Calcular por módulo × rama (sumando todos los títulos)
  const perModuleRama: Record<string, Record<string, number>> = {};
  for (const m of moduleKeys) perModuleRama[m] = {};
  for (const t of titulos) {
    for (const m of moduleKeys) {
      perModuleRama[m]![t.rama] = (perModuleRama[m]![t.rama] ?? 0) + t[m];
    }
  }

  lines.push(`| Módulo | Civil | Procesal | Orgánico | Huérfanas | Total |`);
  lines.push(`|--------|-------|----------|----------|-----------|-------|`);
  for (const m of moduleKeys) {
    const civil = perModuleRama[m]!["DERECHO_CIVIL"] ?? 0;
    const procesal = perModuleRama[m]!["DERECHO_PROCESAL_CIVIL"] ?? 0;
    const organico = perModuleRama[m]!["DERECHO_ORGANICO"] ?? 0;
    const asignados = civil + procesal + organico;
    const huerfanas = (rawCounts[m] ?? 0) - asignados;
    const totalM = rawCounts[m] ?? 0;
    lines.push(
      `| ${moduleLabels[m]} | ${civil} | ${procesal} | ${organico} | ${huerfanas} | ${totalM} |`
    );
  }
  // Totales
  const totals: Record<string, number> = {
    civil: 0,
    procesal: 0,
    organico: 0,
    huerfanas: 0,
    total: 0,
  };
  for (const m of moduleKeys) {
    const civil = perModuleRama[m]!["DERECHO_CIVIL"] ?? 0;
    const procesal = perModuleRama[m]!["DERECHO_PROCESAL_CIVIL"] ?? 0;
    const organico = perModuleRama[m]!["DERECHO_ORGANICO"] ?? 0;
    const totalM = rawCounts[m] ?? 0;
    totals.civil += civil;
    totals.procesal += procesal;
    totals.organico += organico;
    totals.huerfanas += totalM - (civil + procesal + organico);
    totals.total += totalM;
  }
  lines.push(
    `| **Total** | **${totals.civil}** | **${totals.procesal}** | **${totals.organico}** | **${totals.huerfanas}** | **${totals.total}** |`
  );
  lines.push("");
  lines.push("---");
  lines.push("");

  // Cobertura por rama/libro/título
  lines.push("## Cobertura del Índice Maestro");
  lines.push("");

  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    lines.push(`### ${rama.label.toUpperCase()}`);
    lines.push("");
    const ramaTotal = titulos
      .filter((t) => t.rama === ramaKey)
      .reduce((a, b) => a + b.total, 0);
    const ramaCubiertos = titulos.filter(
      (t) => t.rama === ramaKey && t.total > 0
    ).length;
    const ramaTotalTit = titulos.filter((t) => t.rama === ramaKey).length;
    lines.push(
      `_${ramaCubiertos}/${ramaTotalTit} títulos con contenido · ${ramaTotal.toLocaleString("es-CL")} ejercicios_`
    );
    lines.push("");

    for (const sec of rama.secciones) {
      const secTitulos = titulos.filter(
        (t) => t.rama === ramaKey && t.libro === sec.libro
      );
      if (secTitulos.length === 0) continue;

      lines.push(`#### ${sec.label}`);
      lines.push("");
      lines.push(
        `| Título | ID | FC | MCQ | V/F | Def | Fill | Err | Ord | Match | Caso | Dict | TL | Total |`
      );
      lines.push(
        `|--------|----|----|-----|-----|-----|------|-----|-----|-------|------|------|----|-------|`
      );
      for (const t of secTitulos) {
        lines.push(
          `| ${truncate(t.label, 45)} | ${t.id} | ${t.flashcard} | ${t.mcq} | ${t.trueFalse} | ${t.definicion} | ${t.fillBlank} | ${t.errorIdentification} | ${t.orderSequence} | ${t.matchColumns} | ${t.casoPractico} | ${t.dictadoJuridico} | ${t.timeline} | ${t.total} |`
        );
      }
      lines.push("");
    }
    lines.push("");
  }

  // Títulos sin cobertura
  const sinCobertura = titulos.filter((t) => t.total === 0);
  lines.push("---");
  lines.push("");
  lines.push(
    `## Títulos sin cobertura (${sinCobertura.length})`
  );
  lines.push("");

  if (sinCobertura.length === 0) {
    lines.push("_Todos los títulos del Índice Maestro tienen al menos un ejercicio._");
    lines.push("");
  } else {
    // Agrupados por rama/libro
    const grouped = new Map<string, Map<string, TituloCount[]>>();
    for (const t of sinCobertura) {
      let byLibro = grouped.get(t.rama);
      if (!byLibro) {
        byLibro = new Map();
        grouped.set(t.rama, byLibro);
      }
      const arr = byLibro.get(t.libro) ?? [];
      arr.push(t);
      byLibro.set(t.libro, arr);
    }

    let idx = 1;
    lines.push(`| # | ID | Título | Rama | Libro |`);
    lines.push(`|---|-----|--------|------|-------|`);
    for (const [ramaKey, byLibro] of grouped.entries()) {
      const ramaLabel = RAMA_LABEL[ramaKey] ?? ramaKey;
      for (const [libro, arr] of byLibro.entries()) {
        for (const t of arr) {
          lines.push(
            `| ${idx++} | ${t.id} | ${truncate(t.label, 60)} | ${ramaLabel} | ${libro} |`
          );
        }
      }
    }
    lines.push("");
  }

  // Títulos con cobertura crítica
  const criticos = titulos.filter((t) => t.total > 0 && t.total < 5);
  if (criticos.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(
      `## Títulos con cobertura crítica (<5 ejercicios) — ${criticos.length}`
    );
    lines.push("");
    lines.push(`| # | ID | Título | Rama | Libro | Ejercicios |`);
    lines.push(`|---|-----|--------|------|-------|------------|`);
    let i = 1;
    for (const t of criticos.sort((a, b) => a.total - b.total)) {
      const ramaLabel = RAMA_LABEL[t.rama] ?? t.rama;
      lines.push(
        `| ${i++} | ${t.id} | ${truncate(t.label, 60)} | ${ramaLabel} | ${t.libro} | ${t.total} |`
      );
    }
    lines.push("");
  }

  // Keys huérfanas
  if (orphans.length > 0) {
    lines.push("---");
    lines.push("");
    lines.push(
      `## Keys huérfanas detectadas (${orphans.length})`
    );
    lines.push("");
    lines.push(
      `_Rows con \`titulo\`/\`tituloMateria\` que no existen en el Índice Maestro para su rama._`
    );
    lines.push("");
    lines.push(`| Modelo | Rama | Key | Rows |`);
    lines.push(`|--------|------|-----|------|`);
    for (const o of orphans
      .slice()
      .sort((a, b) => b.count - a.count)
      .slice(0, 100)) {
      lines.push(
        `| ${o.model} | ${RAMA_LABEL[o.rama] ?? o.rama} | ${o.key} | ${o.count} |`
      );
    }
    if (orphans.length > 100) {
      lines.push(`| … | | | +${orphans.length - 100} más |`);
    }
    lines.push("");
  }

  // Top 5
  lines.push("---");
  lines.push("");
  lines.push("## Top 5 Títulos con más contenido");
  lines.push("");
  lines.push(`| # | ID | Título | Rama | Total |`);
  lines.push(`|---|-----|--------|------|-------|`);
  const top5 = titulos
    .slice()
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);
  let rank = 1;
  for (const t of top5) {
    const ramaLabel = RAMA_LABEL[t.rama] ?? t.rama;
    lines.push(
      `| ${rank++} | ${t.id} | ${truncate(t.label, 60)} | ${ramaLabel} | ${t.total} |`
    );
  }
  lines.push("");

  return lines.join("\n");
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  try {
    const { buckets, rawCounts } = await loadAllModels();
    const titulos = buildTituloCounts(buckets);
    const orphans = detectOrphanKeys(buckets);

    const md = emitMarkdown(titulos, rawCounts, orphans);

    const outputDir = path.resolve("outputs");
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });
    const outPath = path.join(outputDir, "catastro_contenido.md");
    fs.writeFileSync(outPath, md, "utf8");

    const total = titulos.reduce((acc, t) => acc + t.total, 0);
    const cubiertos = titulos.filter((t) => t.total > 0).length;
    console.log(`\n✓ Catastro emitido: ${outPath}`);
    console.log(
      `  Total ejercicios: ${total} · Cobertura: ${cubiertos}/${titulos.length} títulos (${Math.round((cubiertos / titulos.length) * 100)}%)`
    );
    console.log(`  Keys huérfanas: ${orphans.length}`);

    // Top 5 en stdout
    const top5 = titulos
      .slice()
      .sort((a, b) => b.total - a.total)
      .slice(0, 5);
    console.log("\n  Top 5 títulos:");
    for (const t of top5) {
      console.log(`    ${t.id} (${t.rama}) → ${t.total}`);
    }

    // Sin cobertura por rama
    const sinByRama: Record<string, number> = {};
    for (const t of titulos) {
      if (t.total === 0) sinByRama[t.rama] = (sinByRama[t.rama] ?? 0) + 1;
    }
    console.log("\n  Títulos sin cobertura por rama:");
    for (const [r, n] of Object.entries(sinByRama)) {
      console.log(`    ${r}: ${n}`);
    }
  } catch (e) {
    const err = e as Error;
    console.error("\n❌ ERROR ejecutando catastro:", err.message);
    if (err.stack) console.error(err.stack);
    console.error(
      "\nVerifica que DIRECT_URL/DATABASE_URL en .env.local estén correctas y accesibles."
    );
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
