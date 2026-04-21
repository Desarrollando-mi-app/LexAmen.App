import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const adapter = new PrismaPg({ connectionString: process.env.DIRECT_URL ?? process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

const models = [
  "flashcard", "mCQ", "trueFalse", "definicion", "fillBlank",
  "errorIdentification", "orderSequence", "matchColumns",
  "casoPractico", "dictadoJuridico", "timeline",
];

async function main() {
  let total = 0;
  const byTitulo: Record<string, number> = {};
  const byRamaTitulo: Record<string, number> = {};
  for (const m of models) {
    const rows = await (prisma as any)[m].findMany({
      where: { libro: "LEY_17336" as never },
      select: { id: true, titulo: true, parrafo: true, rama: true },
    });
    const bad = rows.filter((r: any) => !r.titulo || !r.titulo.startsWith("L17336_"));
    if (bad.length > 0) {
      console.log(`${m}: ${bad.length} fuera de rango`);
      for (const r of bad) {
        byTitulo[r.titulo ?? "(null)"] = (byTitulo[r.titulo ?? "(null)"] ?? 0) + 1;
        const k = `${r.rama}|${r.titulo ?? "(null)"}`;
        byRamaTitulo[k] = (byRamaTitulo[k] ?? 0) + 1;
      }
      total += bad.length;
    }
  }
  console.log(`\nTOTAL fuera: ${total}`);
  console.log(`\nPor titulo:`);
  for (const [k, v] of Object.entries(byTitulo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  console.log(`\nPor (rama, titulo):`);
  for (const [k, v] of Object.entries(byRamaTitulo).sort((a, b) => b[1] - a[1])) {
    console.log(`  ${k}: ${v}`);
  }
  await prisma.$disconnect();
}
main().catch((e) => { console.error(e); process.exit(1); });
