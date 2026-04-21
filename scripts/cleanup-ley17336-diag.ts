/**
 * Cleanup LEY_17336 — Diagnóstico.
 *
 * 1) Lee la flashcard huérfana `cmn3wgqd0001t310ze0t4f0hl` completa.
 * 2) Cuenta registros con `libro=LEY_17336` en los 11 modelos.
 * 3) Muestra sample de cada modelo (up to 3) con campos relevantes.
 * 4) Cuenta también `leyAnexa=LEY_17336` vs `libro=LEY_17336` para comparar.
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true } as never);
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true } as never);
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/* eslint-disable @typescript-eslint/no-explicit-any */

async function main() {
  console.log("─── Cleanup LEY_17336 · Diagnóstico ───\n");

  // 1) Flashcard huérfana completa
  const fc = await prisma.flashcard.findUnique({
    where: { id: "cmn3wgqd0001t310ze0t4f0hl" },
  });
  console.log("1) Flashcard huérfana (cmn3wgqd0001t310ze0t4f0hl):");
  if (!fc) {
    console.log("   (no encontrada)\n");
  } else {
    console.log(`   rama:          ${fc.rama}`);
    console.log(`   libro:         ${fc.libro}`);
    console.log(`   titulo:        ${fc.titulo}`);
    console.log(`   parrafo:       ${fc.parrafo}`);
    console.log(`   codigo:        ${fc.codigo}`);
    console.log(`   leyAnexa:      ${fc.leyAnexa}`);
    console.log(`   articuloRef:   ${fc.articuloRef ?? "(null)"}`);
    console.log(`   esIntegrador:  ${fc.esIntegrador}`);
    console.log(`   front:         ${fc.front}`);
    console.log(`   back (head):   ${fc.back.slice(0, 180)}${fc.back.length > 180 ? "…" : ""}`);
    console.log();
  }

  // 2) Conteo libro=LEY_17336 por modelo
  const MODELOS: Array<{ nombre: string; client: any; tituloField: "titulo" | "tituloMateria" }> = [
    { nombre: "Flashcard",           client: prisma.flashcard,           tituloField: "titulo" },
    { nombre: "MCQ",                 client: prisma.mCQ,                 tituloField: "titulo" },
    { nombre: "TrueFalse",           client: prisma.trueFalse,           tituloField: "titulo" },
    { nombre: "Definicion",          client: prisma.definicion,          tituloField: "titulo" },
    { nombre: "FillBlank",           client: prisma.fillBlank,           tituloField: "titulo" },
    { nombre: "ErrorIdentification", client: prisma.errorIdentification, tituloField: "titulo" },
    { nombre: "OrderSequence",       client: prisma.orderSequence,       tituloField: "tituloMateria" },
    { nombre: "MatchColumns",        client: prisma.matchColumns,        tituloField: "tituloMateria" },
    { nombre: "CasoPractico",        client: prisma.casoPractico,        tituloField: "tituloMateria" },
    { nombre: "DictadoJuridico",     client: prisma.dictadoJuridico,     tituloField: "tituloMateria" },
    { nombre: "Timeline",            client: prisma.timeline,            tituloField: "tituloMateria" },
  ];

  console.log("2) Conteos por modelo:");
  console.log("   Modelo                 libro=LEY_17336  leyAnexa=LEY_17336");
  console.log("   ──────────────────────  ───────────────  ──────────────────");
  let totalMal = 0;
  const detalleMal: Array<{ nombre: string; count: number; tituloField: "titulo" | "tituloMateria" }> = [];
  for (const m of MODELOS) {
    const [cMal, cBien] = await Promise.all([
      m.client.count({ where: { libro: "LEY_17336" } }),
      m.client.count({ where: { leyAnexa: "LEY_17336" } }).catch(() => 0),
    ]);
    console.log(`   ${m.nombre.padEnd(22)}  ${String(cMal).padStart(15)}  ${String(cBien).padStart(18)}`);
    if (cMal > 0) {
      totalMal += cMal;
      detalleMal.push({ nombre: m.nombre, count: cMal, tituloField: m.tituloField });
    }
  }
  console.log(`                           ───────────────`);
  console.log(`   TOTAL con libro mal:   ${String(totalMal).padStart(15)}\n`);

  // 3) Agrupación por (titulo/tituloMateria, parrafo) de los mal clasificados
  console.log("3) Distribución de los mal-clasificados por (titulo, parrafo):");
  for (const d of detalleMal) {
    const m = MODELOS.find((x) => x.nombre === d.nombre)!;
    const groups = await m.client.groupBy({
      by: [m.tituloField, "parrafo"],
      where: { libro: "LEY_17336" },
      _count: { id: true },
    });
    console.log(`\n   ${d.nombre} (${d.count} registros):`);
    for (const g of groups) {
      const t = (g as any)[m.tituloField] ?? "(null)";
      const p = (g as any).parrafo ?? "(null)";
      console.log(`     ${t.padEnd(12)}  parrafo=${p.padEnd(10)}  → ${(g as any)._count.id}`);
    }
  }

  // 4) Sample de fronts/preguntas para decidir reclasificación
  console.log("\n4) Muestras (primeras 3 de cada modelo con libro=LEY_17336):");
  for (const d of detalleMal) {
    const m = MODELOS.find((x) => x.nombre === d.nombre)!;
    const sample = await m.client.findMany({
      where: { libro: "LEY_17336" },
      take: 3,
    });
    console.log(`\n   · ${d.nombre}:`);
    for (const row of sample) {
      const label = row.front ?? row.pregunta ?? row.termino ?? row.enunciado ?? row.titulo ?? row.id;
      console.log(`     [${row.id}] ${String(label).slice(0, 120)}`);
      console.log(`       ${m.tituloField}=${row[m.tituloField] ?? "(null)"}  parrafo=${row.parrafo ?? "(null)"}  codigo=${row.codigo ?? "(null)"}  leyAnexa=${row.leyAnexa ?? "(null)"}  articuloRef=${row.articuloRef ?? "(null)"}`);
    }
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
