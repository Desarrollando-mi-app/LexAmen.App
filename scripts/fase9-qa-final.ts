/**
 * Fase 9 — QA Final.
 *
 * Complementa `catastro-cobertura.ts` con validaciones extra introducidas en
 * las fases 7, 8 y Opción C:
 *   · Orphan parrafos  → rows con `parrafo` que no existen en CURRICULUM
 *                         para su (rama, titulo/tituloMateria) correspondiente.
 *   · Orphan libros    → rows con `libro` que no existe como seccion.libro
 *                         ni como ley anexa declarada en CURRICULUM[rama].
 *   · Integradores     → breakdown de `esIntegrador=true` por modelo × rama.
 *   · LEY_17336 sanity → todos los rows con libro=LEY_17336 apuntan a L17336_T*.
 *
 * Salida: outputs/fase9-qa-final.md (sobrescribe) + resumen en stdout.
 *
 * Uso: npx tsx scripts/fase9-qa-final.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import fs from "node:fs";
import path from "node:path";

dotenv.config({ path: ".env.local", quiet: true, override: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true, override: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Modelos ───────────────────────────────────────────────

interface ModelSpec {
  nombre: string;
  tituloField: "titulo" | "tituloMateria";
  client: any;
}

const MODELOS: ModelSpec[] = [
  { nombre: "Flashcard",           tituloField: "titulo",        client: prisma.flashcard },
  { nombre: "MCQ",                 tituloField: "titulo",        client: prisma.mCQ },
  { nombre: "TrueFalse",           tituloField: "titulo",        client: prisma.trueFalse },
  { nombre: "Definicion",          tituloField: "titulo",        client: prisma.definicion },
  { nombre: "FillBlank",           tituloField: "titulo",        client: prisma.fillBlank },
  { nombre: "ErrorIdentification", tituloField: "titulo",        client: prisma.errorIdentification },
  { nombre: "OrderSequence",       tituloField: "tituloMateria", client: prisma.orderSequence },
  { nombre: "MatchColumns",        tituloField: "tituloMateria", client: prisma.matchColumns },
  { nombre: "CasoPractico",        tituloField: "tituloMateria", client: prisma.casoPractico },
  { nombre: "DictadoJuridico",     tituloField: "tituloMateria", client: prisma.dictadoJuridico },
  { nombre: "Timeline",            tituloField: "tituloMateria", client: prisma.timeline },
];

// ─── Índices de CURRICULUM ─────────────────────────────────

interface CurriculumIndex {
  // rama → set of valid libros (secciones + leyesAnexas)
  librosByRama: Map<string, Set<string>>;
  // rama → titulo → set of valid parrafos
  parrafosByTitulo: Map<string, Map<string, Set<string>>>;
}

function buildIndex(): CurriculumIndex {
  const librosByRama = new Map<string, Set<string>>();
  const parrafosByTitulo = new Map<string, Map<string, Set<string>>>();

  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    const libros = new Set<string>();
    const parByTit = new Map<string, Set<string>>();

    for (const sec of rama.secciones) {
      libros.add(sec.libro);
      for (const t of sec.titulos) {
        const parSet = new Set<string>();
        for (const p of t.parrafos ?? []) parSet.add(p.id);
        parByTit.set(t.id, parSet);
      }
    }
    // Leyes anexas (strings declarativos)
    const leyesAnexas = (rama as any).leyesAnexas as string[] | undefined;
    if (Array.isArray(leyesAnexas)) for (const l of leyesAnexas) libros.add(l);

    librosByRama.set(ramaKey, libros);
    parrafosByTitulo.set(ramaKey, parByTit);
  }

  return { librosByRama, parrafosByTitulo };
}

// ─── Cargas ────────────────────────────────────────────────

interface Row {
  rama: string | null;
  libro: string | null;
  titulo: string | null;
  parrafo: string | null;
  esIntegrador: boolean;
}

async function loadRows(m: ModelSpec): Promise<Row[]> {
  const rows = await m.client.findMany({
    select: {
      rama: true,
      libro: true,
      [m.tituloField]: true,
      parrafo: true,
      esIntegrador: true,
    },
  });
  return rows.map((r: any) => ({
    rama: r.rama ? String(r.rama) : null,
    libro: r.libro ?? null,
    titulo: r[m.tituloField] ?? null,
    parrafo: r.parrafo ?? null,
    esIntegrador: Boolean(r.esIntegrador),
  }));
}

// ─── Main ──────────────────────────────────────────────────

async function main() {
  console.log("─── Fase 9 · QA Final ───\n");
  const idx = buildIndex();

  // Totales globales
  let totalRows = 0;
  let totalIntegradores = 0;
  const orphansLibro: Array<{ modelo: string; rama: string; libro: string; count: number }> = [];
  const orphansParrafo: Array<{ modelo: string; rama: string; titulo: string; parrafo: string; count: number }> = [];
  const integradoresByModel: Array<{ modelo: string; total: number; integradores: number }> = [];
  const integradoresByModelRama = new Map<string, Map<string, number>>();

  // Para el caso especial LEY_17336
  let ley17336OutOfRange = 0;
  const ley17336Buckets = new Map<string, number>(); // "T?_P?" → count

  console.log("Cargando rows de 11 modelos…");

  for (const m of MODELOS) {
    const rows = await loadRows(m);
    totalRows += rows.length;

    const libroCounter = new Map<string, number>();           // rama|libro → count (para orphans libro)
    const parrafoCounter = new Map<string, number>();         // rama|titulo|parrafo → count
    let integradores = 0;
    const byRama = new Map<string, number>();

    for (const r of rows) {
      if (r.esIntegrador) integradores++;
      if (!r.rama) continue;

      byRama.set(r.rama, (byRama.get(r.rama) ?? 0) + 1);

      // libro orphan check
      if (r.libro) {
        const validLibros = idx.librosByRama.get(r.rama);
        if (!validLibros || !validLibros.has(r.libro)) {
          const k = `${r.rama}|${r.libro}`;
          libroCounter.set(k, (libroCounter.get(k) ?? 0) + 1);
        }
      }

      // parrafo orphan check (solo si tiene parrafo Y titulo válido)
      if (r.parrafo && r.titulo) {
        const parByTit = idx.parrafosByTitulo.get(r.rama);
        const validPars = parByTit?.get(r.titulo);
        if (!validPars || !validPars.has(r.parrafo)) {
          const k = `${r.rama}|${r.titulo}|${r.parrafo}`;
          parrafoCounter.set(k, (parrafoCounter.get(k) ?? 0) + 1);
        }
      }

      // LEY_17336 specific sanity
      if (r.libro === "LEY_17336") {
        if (!r.titulo || !r.titulo.startsWith("L17336_")) {
          ley17336OutOfRange++;
        } else {
          const bucket = `${r.titulo}${r.parrafo ? `/${r.parrafo}` : ""}`;
          ley17336Buckets.set(bucket, (ley17336Buckets.get(bucket) ?? 0) + 1);
        }
      }
    }

    totalIntegradores += integradores;
    integradoresByModel.push({ modelo: m.nombre, total: rows.length, integradores });
    integradoresByModelRama.set(m.nombre, byRama);

    // Acumular orphans globales
    for (const [k, n] of libroCounter.entries()) {
      const [rama, libro] = k.split("|");
      orphansLibro.push({ modelo: m.nombre, rama, libro, count: n });
    }
    for (const [k, n] of parrafoCounter.entries()) {
      const [rama, titulo, parrafo] = k.split("|");
      orphansParrafo.push({ modelo: m.nombre, rama, titulo, parrafo, count: n });
    }

    process.stdout.write(`  ${m.nombre.padEnd(22)} ${rows.length.toString().padStart(5)} rows · ${integradores.toString().padStart(4)} integradores\n`);
  }

  console.log(`\n  Total rows:          ${totalRows.toLocaleString("es-CL")}`);
  console.log(`  Total integradores:  ${totalIntegradores.toLocaleString("es-CL")}`);
  console.log(`  Orphans libro:       ${orphansLibro.length} agrupaciones (modelo×rama×libro)`);
  console.log(`  Orphans parrafo:     ${orphansParrafo.length} agrupaciones (modelo×rama×titulo×parrafo)`);
  console.log(`  LEY_17336 fuera de L17336_*: ${ley17336OutOfRange}`);

  // ─── Emit markdown ───
  const lines: string[] = [];
  const today = new Date().toISOString().slice(0, 10);

  lines.push(`# Fase 9 · QA Final`);
  lines.push(`_Auditoría generada el ${today}_`);
  lines.push("");
  lines.push("---");
  lines.push("");
  lines.push("## Resumen");
  lines.push("");
  lines.push(`| Métrica | Valor |`);
  lines.push(`|---------|-------|`);
  lines.push(`| Total rows (11 modelos) | ${totalRows.toLocaleString("es-CL")} |`);
  lines.push(`| Total integradores (\`esIntegrador=true\`) | ${totalIntegradores.toLocaleString("es-CL")} |`);
  lines.push(`| % integradores sobre total | ${((totalIntegradores / totalRows) * 100).toFixed(1)}% |`);
  lines.push(`| Orphans libro (agrupaciones) | ${orphansLibro.length} |`);
  lines.push(`| Orphans parrafo (agrupaciones) | ${orphansParrafo.length} |`);
  lines.push(`| LEY_17336 fuera de estructura | ${ley17336OutOfRange} |`);
  lines.push("");

  // ─── Integradores por modelo ───
  lines.push("---");
  lines.push("");
  lines.push("## Integradores por módulo");
  lines.push("");
  lines.push(`| Módulo | Total rows | Integradores | % |`);
  lines.push(`|--------|-----------:|-------------:|--:|`);
  for (const r of integradoresByModel) {
    const pct = r.total > 0 ? ((r.integradores / r.total) * 100).toFixed(1) : "0.0";
    lines.push(`| ${r.modelo} | ${r.total} | ${r.integradores} | ${pct}% |`);
  }
  lines.push(`| **Total** | **${totalRows}** | **${totalIntegradores}** | **${((totalIntegradores / totalRows) * 100).toFixed(1)}%** |`);
  lines.push("");

  // ─── LEY_17336 buckets ───
  lines.push("---");
  lines.push("");
  lines.push("## LEY_17336 · Distribución por título/párrafo");
  lines.push("");
  if (ley17336Buckets.size === 0) {
    lines.push("_Sin registros con libro=LEY_17336._");
  } else {
    lines.push(`| Título/Párrafo | Rows |`);
    lines.push(`|----------------|-----:|`);
    const sorted = [...ley17336Buckets.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    let tot = 0;
    for (const [k, n] of sorted) {
      lines.push(`| ${k} | ${n} |`);
      tot += n;
    }
    lines.push(`| **Total** | **${tot}** |`);
    if (ley17336OutOfRange > 0) {
      lines.push("");
      lines.push(`⚠ **${ley17336OutOfRange}** registros con libro=LEY_17336 apuntan a un título fuera de L17336_*.`);
    } else {
      lines.push("");
      lines.push(`✓ Todos los registros con libro=LEY_17336 apuntan correctamente a L17336_T*.`);
    }
  }
  lines.push("");

  // ─── Orphans libro ───
  lines.push("---");
  lines.push("");
  lines.push(`## Orphans · \`libro\` no existente en CURRICULUM (${orphansLibro.length})`);
  lines.push("");
  if (orphansLibro.length === 0) {
    lines.push("_Todos los valores de `libro` existen en CURRICULUM (como sección o ley anexa)._");
  } else {
    const byRamaLibro = new Map<string, number>();
    for (const o of orphansLibro) {
      const k = `${o.rama}|${o.libro}`;
      byRamaLibro.set(k, (byRamaLibro.get(k) ?? 0) + o.count);
    }
    lines.push(`| Rama | Libro | Rows afectadas |`);
    lines.push(`|------|-------|---------------:|`);
    const sorted = [...byRamaLibro.entries()].sort((a, b) => b[1] - a[1]);
    for (const [k, n] of sorted.slice(0, 50)) {
      const [rama, libro] = k.split("|");
      lines.push(`| ${rama} | ${libro} | ${n} |`);
    }
    if (sorted.length > 50) lines.push(`| … | | +${sorted.length - 50} grupos más |`);
  }
  lines.push("");

  // ─── Orphans parrafo ───
  lines.push("---");
  lines.push("");
  lines.push(`## Orphans · \`parrafo\` no existente en CURRICULUM para su título (${orphansParrafo.length})`);
  lines.push("");
  if (orphansParrafo.length === 0) {
    lines.push("_Todos los valores de `parrafo` son válidos para su (rama, título)._");
  } else {
    // Agrupar por (rama, titulo, parrafo)
    const byKey = new Map<string, number>();
    for (const o of orphansParrafo) {
      const k = `${o.rama}|${o.titulo}|${o.parrafo}`;
      byKey.set(k, (byKey.get(k) ?? 0) + o.count);
    }
    lines.push(`| Rama | Título | Párrafo | Rows afectadas |`);
    lines.push(`|------|--------|---------|---------------:|`);
    const sorted = [...byKey.entries()].sort((a, b) => b[1] - a[1]);
    for (const [k, n] of sorted.slice(0, 60)) {
      const [rama, titulo, parrafo] = k.split("|");
      lines.push(`| ${rama} | ${titulo} | ${parrafo} | ${n} |`);
    }
    if (sorted.length > 60) lines.push(`| … | | | +${sorted.length - 60} grupos más |`);
  }
  lines.push("");

  const outPath = path.resolve("outputs", "fase9-qa-final.md");
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, lines.join("\n"), "utf8");
  console.log(`\n✓ Reporte emitido: ${outPath}\n`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
