/**
 * Fase 10 — Diagnóstico de libros orphan
 *
 * Para cada grupo (rama, libro_legacy), muestra:
 * - Total rows + distribución por modelo
 * - Top 15 títulos con su recuento
 *
 * Output: outputs/fase10-diag-libros-orphan.md
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
if (!connectionString) {
  console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado");
  process.exit(1);
}

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

/* eslint-disable @typescript-eslint/no-explicit-any */

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

interface Row {
  rama: string;
  libro: string | null;
  titulo: string | null;
  esIntegrador: boolean;
  model: string;
}

async function main() {
  // Build valid libros por rama
  const librosByRama = new Map<string, Set<string>>();
  for (const [ramaKey, ramaNode] of Object.entries(CURRICULUM)) {
    const libros = new Set<string>();
    for (const sec of ramaNode.secciones) libros.add(sec.libro);
    const leyesAnexas = (ramaNode as any).leyesAnexas as string[] | undefined;
    if (Array.isArray(leyesAnexas)) for (const l of leyesAnexas) libros.add(l);
    librosByRama.set(ramaKey, libros);
  }

  // Load all rows
  const allRows: Row[] = [];
  for (const m of MODELOS) {
    const select: Record<string, boolean> = {
      rama: true,
      libro: true,
      esIntegrador: true,
    };
    select[m.tituloField] = true;
    const rows = await m.client.findMany({ select });
    for (const r of rows) {
      allRows.push({
        rama: r.rama,
        libro: r.libro,
        titulo: r[m.tituloField],
        esIntegrador: r.esIntegrador ?? false,
        model: m.nombre,
      });
    }
  }

  // Filter orphans
  const orphans = allRows.filter((r) => {
    if (!r.libro) return false;
    const validLibros = librosByRama.get(r.rama);
    if (!validLibros) return true;
    return !validLibros.has(r.libro);
  });

  // Group by (rama, libro)
  const groups = new Map<string, Row[]>();
  for (const r of orphans) {
    const key = `${r.rama}|${r.libro}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(r);
  }

  let md = `# Fase 10 · Diagnóstico libros orphan\n\n`;
  md += `_Generado el ${new Date().toISOString().slice(0, 10)}_\n\n`;
  md += `- Total orphan rows: **${orphans.length}**\n`;
  md += `- Grupos (rama, libro): **${groups.size}**\n\n---\n\n`;

  const sortedGroups = Array.from(groups.entries()).sort(
    (a, b) => b[1].length - a[1].length
  );

  for (const [key, rows] of sortedGroups) {
    const [rama, libro] = key.split("|");
    const integradores = rows.filter((r) => r.esIntegrador).length;
    md += `## ${rama} · \`${libro}\` — ${rows.length} rows (integradores: ${integradores})\n\n`;

    const byModel = new Map<string, number>();
    for (const r of rows) byModel.set(r.model, (byModel.get(r.model) ?? 0) + 1);
    md += `**Por modelo:** `;
    md += Array.from(byModel.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([m, n]) => `${m}(${n})`)
      .join(" · ");
    md += `\n\n`;

    const byTitulo = new Map<string, number>();
    for (const r of rows) {
      const t = r.titulo ?? "(null)";
      byTitulo.set(t, (byTitulo.get(t) ?? 0) + 1);
    }
    const sortedTitulos = Array.from(byTitulo.entries()).sort((a, b) => b[1] - a[1]);
    const topTitulos = sortedTitulos.slice(0, 20);

    md += `| Título | Rows |\n|--------|-----:|\n`;
    for (const [t, n] of topTitulos) md += `| \`${t}\` | ${n} |\n`;
    if (sortedTitulos.length > 20) {
      const remaining = sortedTitulos.length - 20;
      const remainRows = sortedTitulos.slice(20).reduce((a, [, n]) => a + n, 0);
      md += `| _(+${remaining} títulos más, ${remainRows} rows)_ | ... |\n`;
    }
    md += `\n---\n\n`;
  }

  fs.writeFileSync("outputs/fase10-diag-libros-orphan.md", md);
  console.log(`✓ Reporte: outputs/fase10-diag-libros-orphan.md`);
  console.log(`  Orphans: ${orphans.length} | Grupos: ${groups.size}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
