/**
 * Fase 8-bis — Diagnóstico: títulos hoja cuyo label empieza con `§`.
 *
 * En la convención jurídica chilena, `§` denota párrafo (no título).
 * Por lo tanto todo nodo dentro de `secciones[].titulos[]` cuyo label empiece
 * con `§` está estructuralmente mal clasificado: debería ser un ParrafoNode
 * dentro de un título contenedor, no un TituloNode hoja.
 *
 * Este script recorre CURRICULUM en memoria e identifica:
 *  1. Cuántos "títulos" con § hay (bugs a refactorizar)
 *  2. Agrupados por sección padre (para saber si cabe un título contenedor)
 *  3. Cuántos párrafos correctos ya existen (para comparar orden de magnitud)
 *  4. Cuántos registros en DB referencian los títulos bug (Flashcard + los otros 10 modelos)
 */

import { CURRICULUM } from "../lib/curriculum-data";
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

interface BugTitulo {
  rama: string;
  libro: string;
  seccionLabel: string;
  tituloId: string;
  tituloLabel: string;
  articulosRef?: string;
}

async function main() {
  const bugs: BugTitulo[] = [];
  let parrafosCorrectos = 0;
  let titulosTotales = 0;

  for (const [ramaKey, rama] of Object.entries(CURRICULUM)) {
    for (const seccion of rama.secciones) {
      for (const titulo of seccion.titulos) {
        titulosTotales++;
        if (titulo.label.trimStart().startsWith("§")) {
          bugs.push({
            rama: ramaKey,
            libro: seccion.libro,
            seccionLabel: seccion.label,
            tituloId: titulo.id,
            tituloLabel: titulo.label,
            articulosRef: titulo.articulosRef,
          });
        }
        if (titulo.parrafos) parrafosCorrectos += titulo.parrafos.length;
      }
    }
  }

  console.log("─── Fase 8-bis · Diagnóstico estructural ───\n");
  console.log(`Títulos totales en árbol: ${titulosTotales}`);
  console.log(`Párrafos correctos (dentro de titulos[].parrafos[]): ${parrafosCorrectos}`);
  console.log(`Títulos con label § (BUG — deberían ser párrafos): ${bugs.length}\n`);

  // Agrupar por (rama, libro, sección) para ver candidatos a título contenedor
  const porSeccion = new Map<string, BugTitulo[]>();
  for (const b of bugs) {
    const key = `${b.rama}|${b.libro}|${b.seccionLabel}`;
    if (!porSeccion.has(key)) porSeccion.set(key, []);
    porSeccion.get(key)!.push(b);
  }

  console.log(`Secciones afectadas: ${porSeccion.size}\n`);
  console.log("─── Detalle por sección ───\n");

  const bugTituloIds: string[] = [];
  for (const [key, lista] of porSeccion) {
    const [rama, libro, seccionLabel] = key.split("|");
    console.log(`\n[${lista.length} bugs] ${rama} → ${libro} (${seccionLabel})`);
    for (const b of lista) {
      console.log(`    · ${b.tituloId} — ${b.tituloLabel}${b.articulosRef ? ` [${b.articulosRef}]` : ""}`);
      bugTituloIds.push(b.tituloId);
    }
  }

  if (bugTituloIds.length === 0) {
    console.log("\n✓ No hay títulos mal clasificados. Nada que refactorizar.");
    return;
  }

  // Contar referencias en DB para cada modelo que tenga campo `titulo`.
  console.log("\n─── Referencias en DB a los títulos-bug ───\n");
  const [
    flashcardsRef,
    mcqRef,
    tfRef,
    defRef,
    fillRef,
    errRef,
    ordRef,
    matchRef,
    casoRef,
    dictRef,
    timelineRef,
  ] = await Promise.all([
    prisma.flashcard.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.mCQ.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.trueFalse.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.definicion.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.fillBlank.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.errorIdentification.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.orderSequence.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.matchColumns.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.casoPractico.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.dictadoJuridico.count({ where: { titulo: { in: bugTituloIds } } }),
    prisma.timeline.count({ where: { titulo: { in: bugTituloIds } } }),
  ]);

  const total =
    flashcardsRef + mcqRef + tfRef + defRef + fillRef + errRef +
    ordRef + matchRef + casoRef + dictRef + timelineRef;

  console.log(`Flashcard:             ${flashcardsRef}`);
  console.log(`MCQ:                   ${mcqRef}`);
  console.log(`TrueFalse:             ${tfRef}`);
  console.log(`Definicion:            ${defRef}`);
  console.log(`FillBlank:             ${fillRef}`);
  console.log(`ErrorIdentification:   ${errRef}`);
  console.log(`OrderSequence:         ${ordRef}`);
  console.log(`MatchColumns:          ${matchRef}`);
  console.log(`CasoPractico:          ${casoRef}`);
  console.log(`DictadoJuridico:       ${dictRef}`);
  console.log(`Timeline:              ${timelineRef}`);
  console.log(`                       ─────`);
  console.log(`TOTAL a migrar:        ${total}`);
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
