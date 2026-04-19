/**
 * Fase 7 — Exploración del esquema para cross-rama duplication.
 * Sin escrituras. Solo conteos.
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local", quiet: true });
if (!process.env.DATABASE_URL && !process.env.DIRECT_URL) dotenv.config({ path: ".env", quiet: true });
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!connectionString) { console.error("ERROR: DIRECT_URL/DATABASE_URL no encontrado"); process.exit(1); }

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

// ─── Models con rama + contenido ───
// Los 11 modelos que participan en browse por rama.
const MODELS = [
  { name: "flashcard",           delegate: prisma.flashcard,            contentFields: ["front", "back"] },
  { name: "mcq",                 delegate: prisma.mCQ,                  contentFields: ["question", "optionA", "optionB", "optionC", "optionD", "explanation"] },
  { name: "trueFalse",           delegate: prisma.trueFalse,            contentFields: ["statement", "explanation"] },
  { name: "definicion",          delegate: prisma.definicion,           contentFields: ["concepto", "definicion", "explicacion"] },
  { name: "fillBlank",           delegate: prisma.fillBlank,            contentFields: ["textoConBlancos", "explicacion"] },
  { name: "errorIdentification", delegate: prisma.errorIdentification,  contentFields: ["segmentos"] },
  { name: "orderSequence",       delegate: prisma.orderSequence,        contentFields: ["titulo", "instruccion", "items"] },
  { name: "matchColumns",        delegate: prisma.matchColumns,         contentFields: ["titulo", "instruccion", "pares", "explicacion"] },
  { name: "casoPractico",        delegate: prisma.casoPractico,         contentFields: ["titulo", "hechos", "preguntas", "resumenFinal"] },
  { name: "dictadoJuridico",     delegate: prisma.dictadoJuridico,      contentFields: ["titulo", "textoCompleto"] },
  { name: "timeline",            delegate: prisma.timeline,             contentFields: ["titulo", "instruccion", "eventos"] },
];

async function main() {
  console.log("═══ Fase 7 — Exploración ═══\n");

  for (const m of MODELS) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const d = m.delegate as any;
    const [total, byRama] = await Promise.all([
      d.count(),
      d.groupBy({ by: ["rama"], _count: true }),
    ]);
    const integ = await d.count({ where: { esIntegrador: true } });
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ramas = byRama.map((r: any) => `${r.rama ?? "null"}=${r._count}`).join(" · ");
    console.log(`${m.name.padEnd(22)} total=${String(total).padStart(5)} integ=${String(integ).padStart(4)}  [${ramas}]`);
  }

  // articuloRef analysis on flashcard (has this field per schema)
  console.log("\n─── articuloRef cross-reference (flashcards) ───");
  const withRef = await prisma.flashcard.count({ where: { articuloRef: { not: null } } });
  const allFc = await prisma.flashcard.count();
  console.log(`flashcards con articuloRef: ${withRef}/${allFc}`);

  // Sample articuloRef values to understand format
  const samples = await prisma.flashcard.findMany({
    where: { articuloRef: { not: null } },
    select: { articuloRef: true, rama: true },
    take: 20,
  });
  console.log("Muestras articuloRef:");
  for (const s of samples) console.log(`  [${s.rama}] ${s.articuloRef}`);

  await prisma.$disconnect();
}

main().catch(async (e) => { console.error(e); await prisma.$disconnect(); process.exit(1); });
