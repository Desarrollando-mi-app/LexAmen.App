/**
 * Fase 10 — Mapeo de libros legacy al CURRICULUM
 *
 * Regla maestra: el `titulo` es más confiable que el `libro`. El prefijo del
 * título dicta el libro correcto del CURRICULUM.
 *
 * Uso:
 *   DRY:    npx tsx scripts/fase10-libros-legacy-apply.ts
 *   APPLY:  npx tsx scripts/fase10-libros-legacy-apply.ts --apply
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { CURRICULUM } from "../lib/curriculum-data";
import dotenv from "dotenv";
import fs from "node:fs";

dotenv.config({ path: ".env.local", quiet: true, override: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true, override: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const APPLY = process.argv.includes("--apply");

/* eslint-disable @typescript-eslint/no-explicit-any */

// ─── Modelos ────────────────────────────────────────────────

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

// ─── Mapa determinista ──────────────────────────────────────

interface Mapped {
  rama: string;
  libro: string;
  ramasAdicionales?: string[];
}

/**
 * Dado (rama, libro legacy, titulo), devuelve { rama, libro } correcto o null.
 */
function mapOrphan(
  rama: string,
  _libro: string,
  titulo: string | null,
): Mapped | null {
  const t = (titulo ?? "").trim();

  // ─── Civil: Título Preliminar ───
  if (t === "TP_MAIN" || /^TP_/.test(t)) {
    return { rama: "DERECHO_CIVIL", libro: "TITULO_PRELIMINAR" };
  }

  // ─── Civil: prefijos LI_*, LII_*, LIII_*, LIV_* o exactos LIBRO_I..IV ───
  if (t === "LIBRO_I" || /^LI_/.test(t)) {
    return { rama: "DERECHO_CIVIL", libro: "LIBRO_I" };
  }
  if (t === "LIBRO_II" || /^LII_/.test(t)) {
    return { rama: "DERECHO_CIVIL", libro: "LIBRO_II" };
  }
  if (t === "LIBRO_III" || /^LIII_/.test(t)) {
    return { rama: "DERECHO_CIVIL", libro: "LIBRO_III" };
  }
  if (t === "LIBRO_IV" || /^LIV_/.test(t)) {
    return { rama: "DERECHO_CIVIL", libro: "LIBRO_IV" };
  }

  // ─── CPC: prefijos CPC_LI_*, CPC_LII_*, etc. ───
  if (/^CPC_LI_/.test(t)) {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_I_CPC" };
  }
  if (/^CPC_LII_/.test(t)) {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_II_CPC" };
  }
  if (/^CPC_LIII_/.test(t)) {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_III_CPC" };
  }
  if (/^CPC_LIV_/.test(t)) {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_IV_CPC" };
  }

  // ─── Integradores temáticos CPC ───
  if (t === "CPC_JUICIO_ORDINARIO") {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_II_CPC" };
  }
  if (t === "CPC_JUICIOS_ESPECIALES") {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_III_CPC" };
  }
  if (t === "CPC_ACTOS_NO_CONTENCIOSOS") {
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_IV_CPC" };
  }
  if (t === "CPC_COMPLETO") {
    // Integrador general de todo el CPC → default al primer libro
    return { rama: "DERECHO_PROCESAL_CIVIL", libro: "LIBRO_I_CPC" };
  }

  // ─── COT ───
  if (t === "COT_INTEGRADOR_FINAL") {
    // Integrador de COT. Si venía de DPC, crossover: rama primaria = DERECHO_ORGANICO,
    // ramasAdicionales incluye DPC.
    if (rama === "DERECHO_PROCESAL_CIVIL") {
      return {
        rama: "DERECHO_ORGANICO",
        libro: "LIBRO_COT",
        ramasAdicionales: ["DERECHO_PROCESAL_CIVIL"],
      };
    }
    return { rama: "DERECHO_ORGANICO", libro: "LIBRO_COT" };
  }
  if (/^COT_/.test(t)) {
    return { rama: "DERECHO_ORGANICO", libro: "LIBRO_COT" };
  }

  // ─── MODULO_DIARIO y otros sin patrón → no mapear ───
  return null;
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  const mode = APPLY ? "APPLY" : "DRY-RUN";
  console.log(`\n═══ Fase 10 · Libros legacy · ${mode} ═══\n`);

  // Build valid libros por rama
  const librosByRama = new Map<string, Set<string>>();
  for (const [ramaKey, ramaNode] of Object.entries(CURRICULUM)) {
    const libros = new Set<string>();
    for (const sec of ramaNode.secciones) libros.add(sec.libro);
    const leyesAnexas = (ramaNode as any).leyesAnexas as string[] | undefined;
    if (Array.isArray(leyesAnexas)) for (const l of leyesAnexas) libros.add(l);
    librosByRama.set(ramaKey, libros);
  }

  // Sanity: targets del mapa deben existir en CURRICULUM
  const sanityTargets: Array<[string, string]> = [
    ["DERECHO_CIVIL", "LIBRO_I"], ["DERECHO_CIVIL", "LIBRO_II"],
    ["DERECHO_CIVIL", "LIBRO_III"], ["DERECHO_CIVIL", "LIBRO_IV"],
    ["DERECHO_PROCESAL_CIVIL", "LIBRO_I_CPC"], ["DERECHO_PROCESAL_CIVIL", "LIBRO_II_CPC"],
    ["DERECHO_PROCESAL_CIVIL", "LIBRO_III_CPC"], ["DERECHO_PROCESAL_CIVIL", "LIBRO_IV_CPC"],
    ["DERECHO_ORGANICO", "LIBRO_COT"],
  ];
  for (const [r, l] of sanityTargets) {
    if (!librosByRama.get(r)?.has(l)) {
      console.error(`❌ Target inválido: ${r} · ${l} no está en CURRICULUM`);
      process.exit(1);
    }
  }
  console.log(`✓ Sanity check: ${sanityTargets.length} targets válidos en CURRICULUM\n`);

  let totalCandidates = 0;
  let totalMapped = 0;
  let totalSkipped = 0;
  let totalRamaCrossover = 0;
  const skipSamples: Array<{ model: string; rama: string; libro: string; titulo: string; id: string }> = [];
  const mapSamples: Array<{ model: string; from: string; to: string; count: number }> = [];

  // Report breakdown
  const breakdown = new Map<string, number>(); // "from -> to" → count

  for (const m of MODELOS) {
    const select: Record<string, boolean> = {
      id: true,
      rama: true,
      libro: true,
      esIntegrador: true,
      ramasAdicionales: true,
    };
    select[m.tituloField] = true;
    const rows = await m.client.findMany({ select });

    const updates: Array<{ id: string; data: any }> = [];
    let modelSkipped = 0;

    for (const r of rows) {
      if (!r.libro) continue;
      const validLibros = librosByRama.get(r.rama);
      if (validLibros?.has(r.libro)) continue; // no es orphan

      totalCandidates++;
      const titulo = r[m.tituloField];
      const mapped = mapOrphan(r.rama, r.libro, titulo);

      if (!mapped) {
        totalSkipped++;
        modelSkipped++;
        if (skipSamples.length < 30) {
          skipSamples.push({
            model: m.nombre,
            rama: r.rama,
            libro: r.libro,
            titulo: titulo ?? "(null)",
            id: r.id,
          });
        }
        continue;
      }

      const key = `${r.rama}·${r.libro} → ${mapped.rama}·${mapped.libro}`;
      breakdown.set(key, (breakdown.get(key) ?? 0) + 1);

      const data: any = { libro: mapped.libro };
      if (mapped.rama !== r.rama) {
        data.rama = mapped.rama;
        totalRamaCrossover++;
        // mergear ramasAdicionales manteniendo la rama original si aplica crossover explícito
        if (mapped.ramasAdicionales) {
          const current = new Set<string>(r.ramasAdicionales ?? []);
          for (const ra of mapped.ramasAdicionales) current.add(ra);
          data.ramasAdicionales = Array.from(current);
        }
      }

      updates.push({ id: r.id, data });
      totalMapped++;
    }

    if (updates.length > 0 || modelSkipped > 0) {
      console.log(
        `  ${m.nombre.padEnd(22)} · candidatos: ${(updates.length + modelSkipped).toString().padStart(4)} · mapeados: ${updates.length.toString().padStart(4)} · skip: ${modelSkipped}`,
      );
    }

    if (APPLY && updates.length > 0) {
      let done = 0;
      for (const u of updates) {
        await m.client.update({ where: { id: u.id }, data: u.data });
        done++;
        if (done % 500 === 0) process.stdout.write(".");
      }
      if (done >= 500) console.log("");
    }
  }

  // ─── Report ─────────────────────────────────────────────
  let md = `# Fase 10 · Libros legacy · ${mode}\n\n`;
  md += `_Generado el ${new Date().toISOString().slice(0, 10)}_\n\n`;
  md += `## Resumen\n\n`;
  md += `| Métrica | Valor |\n|---------|------:|\n`;
  md += `| Candidatos (orphans) | ${totalCandidates} |\n`;
  md += `| Mapeados | ${totalMapped} |\n`;
  md += `| Skipped (sin patrón) | ${totalSkipped} |\n`;
  md += `| Cambios de rama (crossover) | ${totalRamaCrossover} |\n\n`;

  md += `## Breakdown por transición\n\n`;
  md += `| From → To | Rows |\n|-----------|-----:|\n`;
  const sortedBreakdown = Array.from(breakdown.entries()).sort((a, b) => b[1] - a[1]);
  for (const [k, v] of sortedBreakdown) md += `| \`${k}\` | ${v} |\n`;

  if (skipSamples.length > 0) {
    md += `\n## Skipped — muestras (hasta 30)\n\n`;
    md += `| Modelo | Rama | Libro legacy | Título | ID |\n|---|---|---|---|---|\n`;
    for (const s of skipSamples) {
      md += `| ${s.model} | ${s.rama} | \`${s.libro}\` | \`${s.titulo}\` | \`${s.id.slice(0, 8)}\` |\n`;
    }
  }

  const outPath = APPLY
    ? "outputs/fase10-libros-legacy-apply.md"
    : "outputs/fase10-libros-legacy-dryrun.md";
  fs.writeFileSync(outPath, md);

  console.log(`\n═══ Resumen ═══`);
  console.log(`  Candidatos : ${totalCandidates}`);
  console.log(`  Mapeados   : ${totalMapped}`);
  console.log(`  Skipped    : ${totalSkipped}`);
  console.log(`  Crossover  : ${totalRamaCrossover}`);
  console.log(`\n✓ Reporte: ${outPath}`);
  if (!APPLY) console.log(`\n⚠️  Dry run. Para aplicar: agrega --apply`);

  await prisma.$disconnect();
}

main().catch((e) => { console.error(e); process.exit(1); });
