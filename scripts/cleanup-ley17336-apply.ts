/**
 * Cleanup LEY_17336 — Paso 2: aplica la reclasificación a DB desde el CSV.
 *
 * Lee outputs/cleanup-ley17336-classify.csv y para cada fila hace:
 *   UPDATE <modelo> SET
 *     <tituloField>=titulo_nuevo,
 *     parrafo=parrafo_nuevo
 *   WHERE id=<id>
 *
 * NOTA: libro ya es "LEY_17336" en todos (eso es correcto post-curriculum).
 * leyAnexa se deja como está (la ley ahora es libro en CURRICULUM, no ley anexa).
 *
 * Todo en una transacción. --dry-run simula.
 *
 * Uso:
 *   npx tsx scripts/cleanup-ley17336-apply.ts --dry-run
 *   npx tsx scripts/cleanup-ley17336-apply.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config({ path: ".env.local", quiet: true, override: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true, override: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const DRY = process.argv.includes("--dry-run");
const CSV = "outputs/cleanup-ley17336-classify.csv";

/* eslint-disable @typescript-eslint/no-explicit-any */

const VALID_TITULOS = new Set([
  "L17336_T1", "L17336_T2", "L17336_T3", "L17336_T4", "L17336_T5",
]);
const VALID_PARRAFOS = new Set([
  "L17336_T1_P1", "L17336_T1_P2", "L17336_T1_P3", "L17336_T1_P4",
  "L17336_T1_P5", "L17336_T1_P6", "L17336_T1_P7",
]);

// Modelo → key Prisma + campo de título
const MODELO_MAP: Record<string, { key: string; tituloField: "titulo" | "tituloMateria" }> = {
  Flashcard:           { key: "flashcard",           tituloField: "titulo" },
  MCQ:                 { key: "mCQ",                 tituloField: "titulo" },
  TrueFalse:           { key: "trueFalse",           tituloField: "titulo" },
  Definicion:          { key: "definicion",          tituloField: "titulo" },
  FillBlank:           { key: "fillBlank",           tituloField: "titulo" },
  ErrorIdentification: { key: "errorIdentification", tituloField: "titulo" },
  OrderSequence:       { key: "orderSequence",       tituloField: "tituloMateria" },
  MatchColumns:        { key: "matchColumns",        tituloField: "tituloMateria" },
  CasoPractico:        { key: "casoPractico",        tituloField: "tituloMateria" },
  DictadoJuridico:     { key: "dictadoJuridico",     tituloField: "tituloMateria" },
  Timeline:            { key: "timeline",            tituloField: "tituloMateria" },
};

function parseCsv(s: string): string[][] {
  const out: string[][] = []; let field = ""; let row: string[] = []; let q = false;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '"' && s[i + 1] === '"') { field += '"'; i++; }
      else if (c === '"') q = false;
      else field += c;
    } else {
      if (c === '"') q = true;
      else if (c === ",") { row.push(field); field = ""; }
      else if (c === "\n") { row.push(field); out.push(row); row = []; field = ""; }
      else field += c;
    }
  }
  if (field || row.length) { row.push(field); out.push(row); }
  return out;
}

interface Row {
  modelo: string;
  id: string;
  titulo_actual: string;
  parrafo_actual: string;
  titulo_nuevo: string;
  parrafo_nuevo: string;
}

async function main() {
  console.log(`─── Cleanup LEY_17336 · Apply ${DRY ? "[DRY-RUN]" : "[REAL]"} ───\n`);
  if (!fs.existsSync(CSV)) {
    console.error(`ERROR: ${CSV} no existe. Corre primero cleanup-ley17336-classify.ts`);
    process.exit(1);
  }

  const rows = parseCsv(fs.readFileSync(CSV, "utf8")).slice(1)
    .filter((r) => r.length >= 7 && r[1]);

  const parsed: Row[] = [];
  for (const r of rows) {
    parsed.push({
      modelo: r[0], id: r[1],
      titulo_actual: r[3], parrafo_actual: r[4],
      titulo_nuevo: r[5], parrafo_nuevo: r[6],
    });
  }

  console.log(`Rows en CSV: ${parsed.length}\n`);

  // Validar
  const invalid: Row[] = [];
  for (const r of parsed) {
    if (!VALID_TITULOS.has(r.titulo_nuevo)) invalid.push(r);
    else if (r.parrafo_nuevo && !VALID_PARRAFOS.has(r.parrafo_nuevo)) invalid.push(r);
    else if (!MODELO_MAP[r.modelo]) invalid.push(r);
  }
  if (invalid.length > 0) {
    console.error(`ABORT: ${invalid.length} filas con valores inválidos:`);
    for (const r of invalid.slice(0, 5)) console.error(`  ${r.modelo}/${r.id} titulo=${r.titulo_nuevo} parrafo=${r.parrafo_nuevo}`);
    process.exit(1);
  }
  console.log("✓ Validación OK (todos los títulos/párrafos existen en CURRICULUM).\n");

  // Resumen por modelo + target
  console.log("─── Plan de UPDATEs ───");
  const byModelTarget = new Map<string, number>();
  for (const r of parsed) {
    const k = `${r.modelo.padEnd(22)}  → ${r.titulo_nuevo}${r.parrafo_nuevo ? `/${r.parrafo_nuevo}` : ""}`;
    byModelTarget.set(k, (byModelTarget.get(k) ?? 0) + 1);
  }
  const sorted = [...byModelTarget.entries()].sort();
  for (const [k, n] of sorted) console.log(`  ${n.toString().padStart(3)}  ${k}`);

  console.log(`\n  Total UPDATEs: ${parsed.length}\n`);

  if (DRY) {
    console.log("✓ DRY-RUN: sin cambios. Re-ejecuta sin --dry-run para aplicar.");
    return;
  }

  // Aplicar en transacción
  console.log("─── Ejecutando UPDATEs (en transacción) ───\n");
  const results = await prisma.$transaction(async (tx) => {
    let n = 0;
    for (const r of parsed) {
      const map = MODELO_MAP[r.modelo];
      await (tx as any)[map.key].update({
        where: { id: r.id },
        data: {
          [map.tituloField]: r.titulo_nuevo,
          parrafo: r.parrafo_nuevo || null,
        },
      });
      n++;
      if (n % 10 === 0) process.stdout.write(`  ${n}/${parsed.length}…\r`);
    }
    return n;
  }, { timeout: 120_000 });

  console.log(`\n✓ ${results} registros actualizados.`);

  // Verificación post
  console.log("\n─── Post-verificación ───");
  const remainingBad = await Promise.all(Object.entries(MODELO_MAP).map(async ([nombre, m]) => {
    const count = await (prisma as any)[m.key].count({
      where: {
        libro: "LEY_17336",
        OR: [
          { [m.tituloField]: { not: { startsWith: "L17336_" } } },
          { parrafo: { not: null, not: { startsWith: "L17336_T1_P" } } },
        ],
      },
    });
    return { nombre, count };
  }));
  const totalBad = remainingBad.reduce((s, r) => s + r.count, 0);
  if (totalBad === 0) {
    console.log("  ✓ Todos los registros con libro=LEY_17336 apuntan a L17336_T*");
  } else {
    console.log(`  ⚠ Quedan ${totalBad} con title/parrafo fuera de L17336_*:`);
    for (const r of remainingBad) if (r.count > 0) console.log(`    · ${r.nombre}: ${r.count}`);
  }

  console.log("\n✓ Cleanup completo.");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
