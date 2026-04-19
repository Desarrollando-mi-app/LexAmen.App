/**
 * Fase 0 — Muestreo de huérfanos.
 * Lectura pura. Extrae 20 rows al azar de las keys huérfanas más pobladas
 * y escribe outputs/fase-0-muestreo.md para validar reglas de reclasificación.
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import * as fs from "node:fs";
import * as path from "node:path";

dotenv.config({ path: ".env.local" });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) {
  dotenv.config({ path: ".env" });
}

const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: No se encontró DIRECT_URL ni DATABASE_URL");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

type Rama = "DERECHO_CIVIL" | "DERECHO_PROCESAL_CIVIL" | "DERECHO_ORGANICO";

// Construir set de titulo.ids válidos por rama
const validByRama: Record<Rama, Set<string>> = {
  DERECHO_CIVIL: new Set(),
  DERECHO_PROCESAL_CIVIL: new Set(),
  DERECHO_ORGANICO: new Set(),
};
for (const [ramaKey, ramaNode] of Object.entries(CURRICULUM) as any) {
  for (const sec of ramaNode.secciones) {
    for (const t of sec.titulos) {
      validByRama[ramaKey as Rama].add(t.id);
    }
  }
}

// Keys a muestrear (rama, key, modelo preferido)
const SAMPLES: Array<{ rama: Rama; key: string; note: string }> = [
  { rama: "DERECHO_CIVIL", key: "LIBRO_IV", note: "Familia B: libro genérico CC" },
  { rama: "DERECHO_CIVIL", key: "LIBRO_I", note: "Familia B: libro genérico CC" },
  { rama: "DERECHO_CIVIL", key: "LIBRO_II", note: "Familia B: libro genérico CC" },
  { rama: "DERECHO_CIVIL", key: "TP", note: "Familia B: Título Preliminar sin subnúmero" },
  { rama: "DERECHO_CIVIL", key: "LIV", note: "Familia B: código de libro" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "CPC_JUICIO_ORDINARIO", note: "Familia A: integrador" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "CPC_JUICIOS_ESPECIALES", note: "Familia A: integrador" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "CPC_ACTOS_NO_CONTENCIOSOS", note: "Familia A: integrador" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "JURISPRUDENCIA", note: "Familia A: integrador" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "LIBRO_II", note: "Familia B: libro CPC" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "CPC_T6", note: "Familia C: título sin prefijo libro" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "CPC_T2", note: "Familia C: título sin prefijo libro" },
  { rama: "DERECHO_PROCESAL_CIVIL", key: "COT_T7", note: "Familia D: rama mal clasificada" },
  { rama: "DERECHO_ORGANICO", key: "COT_INTEGRADOR_FINAL", note: "Familia A: integrador" },
];

const N_PER_KEY = 10; // 10 rows por key × 14 keys = 140 rows totales

async function sampleFlashcard(rama: Rama, key: string) {
  const rows = await prisma.flashcard.findMany({
    where: { rama: rama as any, titulo: key },
    select: { id: true, front: true, back: true, articuloRef: true },
    take: N_PER_KEY,
  });
  return rows.map((r) => ({
    modelo: "Flashcard",
    id: r.id,
    texto: `**P:** ${r.front}\n\n**R:** ${r.back}`,
    ref: r.articuloRef ?? "",
  }));
}

async function sampleMCQ(rama: Rama, key: string) {
  const rows = await prisma.mCQ.findMany({
    where: { rama: rama as any, titulo: key },
    select: { id: true, question: true, correctOption: true, articuloRef: true },
    take: N_PER_KEY,
  });
  return rows.map((r) => ({
    modelo: "MCQ",
    id: r.id,
    texto: `**P:** ${r.question}\n\n**Correcta:** ${r.correctOption}`,
    ref: r.articuloRef ?? "",
  }));
}

async function sampleTrueFalse(rama: Rama, key: string) {
  const rows = await prisma.trueFalse.findMany({
    where: { rama: rama as any, titulo: key },
    select: { id: true, statement: true, isTrue: true, articuloRef: true },
    take: N_PER_KEY,
  });
  return rows.map((r) => ({
    modelo: "TrueFalse",
    id: r.id,
    texto: `**Afirmación:** ${r.statement}\n\n**¿Verdadera?:** ${r.isTrue}`,
    ref: r.articuloRef ?? "",
  }));
}

async function main() {
  const lines: string[] = [];
  lines.push("# Fase 0 — Muestreo de huérfanos\n");
  lines.push(`_Generado ${new Date().toISOString()}. Lectura pura, no se escribe nada._\n`);
  lines.push("Muestra hasta 10 rows por cada key huérfana representativa, variando modelos.");
  lines.push("Objetivo: validar las reglas R1–R8 antes de Fase 3.\n");

  for (const sample of SAMPLES) {
    const ramaLabel = sample.rama.replace("DERECHO_", "").replace("_", " ");
    lines.push(`## ${ramaLabel} · ${sample.key}`);
    lines.push(`_${sample.note}_\n`);

    const isValid = validByRama[sample.rama].has(sample.key);
    if (isValid) {
      lines.push(`> ⚠️ Esta key SÍ existe en CURRICULUM. No es huérfana — es rama mal clasificada.\n`);
    }

    // Determinar qué modelo sondear (intenta Flashcard primero, luego MCQ, luego TF)
    let rows: any[] = [];
    try {
      rows = await sampleFlashcard(sample.rama, sample.key);
      if (rows.length === 0) rows = await sampleMCQ(sample.rama, sample.key);
      if (rows.length === 0) rows = await sampleTrueFalse(sample.rama, sample.key);
    } catch (err: any) {
      lines.push(`> Error: ${err.message}\n`);
      continue;
    }

    if (rows.length === 0) {
      lines.push(`_Sin filas en Flashcard/MCQ/TrueFalse (probablemente en otro modelo)._\n`);
      continue;
    }

    for (const r of rows) {
      lines.push(`**${r.modelo} \`${r.id}\`** ${r.ref ? `· ${r.ref}` : ""}\n`);
      lines.push(r.texto);
      lines.push("");
    }
    lines.push("\n---\n");
  }

  const outPath = path.join(process.cwd(), "outputs", "fase-0-muestreo.md");
  fs.writeFileSync(outPath, lines.join("\n"));
  console.log(`✓ Muestreo escrito: ${outPath}`);
  console.log(`  ${lines.length} líneas, ${SAMPLES.length} keys sondeadas`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
