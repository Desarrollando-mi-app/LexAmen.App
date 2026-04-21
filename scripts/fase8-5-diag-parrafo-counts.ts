/**
 * Fase 8.5 — Diag: verificar que los groupBy por parrafo dan counts coherentes.
 * Muestra los top 10 (rama, libro, titulo, parrafo) con más flashcards y MCQ.
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true } as never);
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL)
  dotenv.config({ path: ".env", quiet: true } as never);
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
const adapter = new PrismaPg({ connectionString: connectionString! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const fcGroups = await prisma.flashcard.groupBy({
    by: ["rama", "libro", "titulo", "parrafo"],
    _count: { id: true },
    where: { parrafo: { not: null } },
    orderBy: { _count: { id: "desc" } },
    take: 10,
  });

  console.log("─── Top 10 flashcards (rama, libro, titulo, parrafo) ───");
  for (const g of fcGroups) {
    console.log(`  ${g.rama.padEnd(24)} ${(g.libro ?? "—").padEnd(24)} ${g.titulo.padEnd(10)} ${(g.parrafo ?? "—").padEnd(6)} → ${g._count.id}`);
  }

  // Totales TP_MAIN por párrafo
  const tpGroups = await prisma.flashcard.groupBy({
    by: ["parrafo"],
    where: { titulo: "TP_MAIN" },
    _count: { id: true },
    orderBy: { parrafo: "asc" },
  });
  console.log("\n─── TP_MAIN flashcards por párrafo ───");
  let tpTotal = 0;
  for (const g of tpGroups) {
    console.log(`  ${(g.parrafo ?? "(null)").padEnd(8)}: ${g._count.id}`);
    tpTotal += g._count.id;
  }
  console.log(`  ──────────────`);
  console.log(`  Total: ${tpTotal}`);

  // Mismo chequeo en MCQ
  const mcqGroups = await prisma.mCQ.groupBy({
    by: ["parrafo"],
    where: { titulo: "TP_MAIN" },
    _count: { id: true },
    orderBy: { parrafo: "asc" },
  });
  console.log("\n─── TP_MAIN MCQ por párrafo ───");
  let mcqTotal = 0;
  for (const g of mcqGroups) {
    console.log(`  ${(g.parrafo ?? "(null)").padEnd(8)}: ${g._count.id}`);
    mcqTotal += g._count.id;
  }
  console.log(`  ──────────────`);
  console.log(`  Total: ${mcqTotal}`);
}

main().catch(console.error).finally(() => prisma.$disconnect());
