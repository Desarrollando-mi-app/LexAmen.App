/**
 * Fase 8-bis — Migración DB: TP_1..TP_6 pasan de ser `titulo` a ser `parrafo`.
 *
 * Mapping por cada registro:
 *   titulo IN ('TP_1','TP_2','TP_3','TP_4','TP_5','TP_6')
 *     → titulo = 'TP_MAIN', parrafo = (el antiguo valor de titulo)
 *
 * Afecta 11 modelos (los que tienen campo `titulo` + `parrafo`). Según el diag
 * anterior, solo 6 tienen registros reales, pero corremos los 11 por seguridad
 * (las demás son no-op).
 *
 * Safety:
 *  - Verifica antes que no exista ningún registro con titulo='TP_MAIN' (evita merge accidental)
 *  - Todo en una transacción: si cualquier paso falla, rollback
 *  - --dry-run: simula los UPDATEs y reporta, pero no commitea
 *
 * Uso:
 *   npx tsx scripts/fase8bis-migrar-tp-parrafos.ts --dry-run   ← primero
 *   npx tsx scripts/fase8bis-migrar-tp-parrafos.ts             ← real
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

const DRY = process.argv.includes("--dry-run");
const BUG_IDS = ["TP_1", "TP_2", "TP_3", "TP_4", "TP_5", "TP_6"];
const TARGET_TITULO = "TP_MAIN";

// Lista de (modelo, función count, función update) con tipado any para uniformidad.
/* eslint-disable @typescript-eslint/no-explicit-any */
const MODELOS: Array<{ nombre: string; client: any }> = [
  { nombre: "Flashcard", client: prisma.flashcard },
  { nombre: "MCQ", client: prisma.mCQ },
  { nombre: "TrueFalse", client: prisma.trueFalse },
  { nombre: "Definicion", client: prisma.definicion },
  { nombre: "FillBlank", client: prisma.fillBlank },
  { nombre: "ErrorIdentification", client: prisma.errorIdentification },
  { nombre: "OrderSequence", client: prisma.orderSequence },
  { nombre: "MatchColumns", client: prisma.matchColumns },
  { nombre: "CasoPractico", client: prisma.casoPractico },
  { nombre: "DictadoJuridico", client: prisma.dictadoJuridico },
  { nombre: "Timeline", client: prisma.timeline },
];

async function main() {
  console.log(`─── Fase 8-bis · Migración ${DRY ? "[DRY-RUN]" : "[REAL]"} ───\n`);

  // 1. Safety check: que TP_MAIN no exista ya en DB (evitar merge accidental)
  console.log("Verificando que TP_MAIN no exista previamente en DB…");
  let preexistentes = 0;
  for (const m of MODELOS) {
    const n = await m.client.count({ where: { titulo: TARGET_TITULO } });
    if (n > 0) {
      console.log(`  ⚠  ${m.nombre}: ${n} registros con titulo='${TARGET_TITULO}' ya existen`);
      preexistentes += n;
    }
  }
  if (preexistentes > 0) {
    console.error(`\nABORT: existen ${preexistentes} registros con titulo='TP_MAIN'. Se requiere revisión manual.`);
    process.exit(1);
  }
  console.log("  ✓ Safe — TP_MAIN no existe en DB.\n");

  // 2. Snapshot pre-migración
  console.log("─── Pre-migración: registros con titulo IN (TP_1..TP_6) ───\n");
  const preTotalesPorTitulo = new Map<string, Record<string, number>>();
  for (const m of MODELOS) {
    const rows = await m.client.groupBy({
      by: ["titulo"],
      where: { titulo: { in: BUG_IDS } },
      _count: { _all: true },
    });
    const dict: Record<string, number> = {};
    for (const r of rows) dict[r.titulo!] = r._count._all;
    preTotalesPorTitulo.set(m.nombre, dict);
  }
  for (const m of MODELOS) {
    const dict = preTotalesPorTitulo.get(m.nombre)!;
    const total = Object.values(dict).reduce((s, n) => s + n, 0);
    if (total === 0) continue;
    const detalle = BUG_IDS.map((id) => `${id}:${dict[id] ?? 0}`).join(" ");
    console.log(`  ${m.nombre.padEnd(22)} ${total.toString().padStart(4)}   ${detalle}`);
  }

  // 3. Ejecutar updates dentro de una transacción
  console.log(`\n─── Ejecutando UPDATEs ${DRY ? "(simulado)" : ""} ───\n`);

  const runUpdates = async (tx: any) => {
    const resultados: Array<{ modelo: string; titulo: string; afectados: number }> = [];
    for (const m of MODELOS) {
      const client = DRY ? m.client : tx[m.nombre.charAt(0).toLowerCase() + m.nombre.slice(1)] ?? tx[m.nombre];
      // Fix casing: Prisma expone modelos con camelCase ("mCQ" → "mCQ"). Usamos el client original ya que
      // dentro de tx los modelos están disponibles con la misma key que en prisma.
      for (const bugId of BUG_IDS) {
        if (DRY) {
          const n = await m.client.count({ where: { titulo: bugId } });
          if (n > 0) resultados.push({ modelo: m.nombre, titulo: bugId, afectados: n });
        } else {
          const res = await tx[modelKey(m.nombre)].updateMany({
            where: { titulo: bugId },
            data: { titulo: TARGET_TITULO, parrafo: bugId },
          });
          if (res.count > 0) resultados.push({ modelo: m.nombre, titulo: bugId, afectados: res.count });
        }
      }
    }
    return resultados;
  };

  let resultados: Array<{ modelo: string; titulo: string; afectados: number }>;
  if (DRY) {
    resultados = await runUpdates(null);
  } else {
    resultados = await prisma.$transaction(
      async (tx) => runUpdates(tx),
      { timeout: 60_000 }
    );
  }

  const totalAfectados = resultados.reduce((s, r) => s + r.afectados, 0);
  for (const r of resultados) {
    console.log(`  ${r.modelo.padEnd(22)} ${r.titulo.padEnd(4)} → TP_MAIN + parrafo=${r.titulo}  (${r.afectados})`);
  }
  console.log(`\n  Total afectados: ${totalAfectados}\n`);

  if (DRY) {
    console.log("✓ DRY-RUN completo. Sin cambios commiteados.");
    console.log("  Re-ejecuta sin --dry-run para aplicar.");
    return;
  }

  // 4. Post-migración: verificar que no queden TP_1..TP_6 en titulo
  console.log("─── Post-migración: verificación ───\n");
  let restantes = 0;
  for (const m of MODELOS) {
    const n = await m.client.count({ where: { titulo: { in: BUG_IDS } } });
    if (n > 0) {
      console.log(`  ⚠  ${m.nombre}: quedan ${n} registros con titulo en BUG_IDS`);
      restantes += n;
    }
  }
  if (restantes > 0) {
    console.error(`\nABORT: quedan ${restantes} registros sin migrar. Revisar.`);
    process.exit(1);
  }
  console.log("  ✓ Ningún registro con titulo IN (TP_1..TP_6).");

  // Verificar TP_MAIN + parrafo IN (TP_1..TP_6)
  let migradoTotal = 0;
  for (const m of MODELOS) {
    const n = await m.client.count({ where: { titulo: TARGET_TITULO, parrafo: { in: BUG_IDS } } });
    migradoTotal += n;
  }
  console.log(`  ✓ Migrados con titulo=TP_MAIN y parrafo IN (TP_1..TP_6): ${migradoTotal}`);
  console.log(`\n✓ Migración completa.`);
}

// Mapea nombre pretty del modelo al key de Prisma client
function modelKey(nombre: string): string {
  // Prisma usa camelCase: MCQ → mCQ, TrueFalse → trueFalse, etc.
  if (nombre === "MCQ") return "mCQ";
  return nombre.charAt(0).toLowerCase() + nombre.slice(1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
