/**
 * Fase 8 — Diagnóstico: qué títulos tienen ya flashcards con `parrafo` seteado.
 *
 * Sirve para darle al user una URL de prueba donde el 4° dropdown "Párrafo"
 * aparezca con opciones reales.
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true } as never);
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true } as never);
const connectionString =
  process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) {
  console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado");
  process.exit(1);
}
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function main() {
  const totalFlashcards = await prisma.flashcard.count();
  const conParrafo = await prisma.flashcard.count({
    where: { parrafo: { not: null } },
  });

  console.log("─── Cobertura de párrafo en Flashcard ───");
  console.log(
    `Total: ${totalFlashcards} · con parrafo: ${conParrafo} (${(
      (conParrafo / totalFlashcards) *
      100
    ).toFixed(1)}%)`
  );
  console.log();

  if (conParrafo === 0) {
    console.log(
      "⚠  Ninguna flashcard tiene `parrafo` seteado todavía — el dropdown de"
    );
    console.log(
      "   párrafo nunca aparecerá hasta que Fase 5/6 poblé algunos. El código"
    );
    console.log("   está correcto, solo falta data.");
    return;
  }

  const rows = await prisma.flashcard.groupBy({
    by: ["rama", "libro", "titulo", "parrafo"],
    where: { parrafo: { not: null } },
    _count: { _all: true },
  });

  const porTitulo = new Map<
    string,
    {
      rama: string;
      libro: string;
      titulo: string;
      parrafos: Map<string, number>;
    }
  >();

  for (const r of rows) {
    const key = `${r.rama}|${r.libro}|${r.titulo}`;
    if (!porTitulo.has(key)) {
      porTitulo.set(key, {
        rama: r.rama,
        libro: r.libro,
        titulo: r.titulo,
        parrafos: new Map(),
      });
    }
    porTitulo.get(key)!.parrafos.set(r.parrafo!, r._count._all);
  }

  const ordenados = [...porTitulo.values()]
    .map((t) => ({
      ...t,
      total: [...t.parrafos.values()].reduce((s, n) => s + n, 0),
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, 10);

  console.log("─── Top 10 títulos con más flashcards con párrafo ───");
  for (const t of ordenados) {
    console.log(
      `\n[${t.total} fc, ${t.parrafos.size} párrafos] ${t.rama} → ${t.libro} → ${t.titulo}`
    );
    const sortedParrafos = [...t.parrafos.entries()].sort(
      (a, b) => b[1] - a[1]
    );
    for (const [pid, n] of sortedParrafos) {
      console.log(`    · ${pid}: ${n}`);
    }
    console.log(
      `    /dashboard/flashcards?rama=${t.rama}&libro=${t.libro}&titulo=${t.titulo}`
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
