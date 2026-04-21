/**
 * Diag rápido: ver cuántas flashcards de TP_1 hay por pool (integrador vs normal)
 * para entender la discrepancia 59 vs 60.
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
  const where = { titulo: "TP_MAIN", parrafo: "TP_1" };
  const total = await prisma.flashcard.count({ where });
  const integradoras = await prisma.flashcard.count({ where: { ...where, esIntegrador: true } });
  const normales = await prisma.flashcard.count({ where: { ...where, esIntegrador: false } });

  console.log(`Flashcards con titulo=TP_MAIN, parrafo=TP_1:`);
  console.log(`  Total:              ${total}`);
  console.log(`  esIntegrador=true:  ${integradoras}`);
  console.log(`  esIntegrador=false: ${normales}`);
  console.log(`  (nulos):            ${total - integradoras - normales}`);

  if (total !== integradoras + normales) {
    const nulls = await prisma.flashcard.findMany({
      where: { ...where, esIntegrador: null as unknown as undefined },
      select: { id: true, front: true },
      take: 5,
    });
    console.log(`\nFlashcards con esIntegrador=NULL:`);
    for (const f of nulls) console.log(`  ${f.id}  ${f.front.slice(0, 80)}`);
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
