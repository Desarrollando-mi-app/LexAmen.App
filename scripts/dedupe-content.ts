/**
 * Deduplicate content: keeps earliest row (by createdAt/id) for each unique key.
 * Key = (front/question/statement/term/titulo/textoCompleto) + rama + libro + titulo
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function dedupe<T extends { id: string }>(
  name: string,
  rows: T[],
  keyFn: (r: T) => string,
  deleteFn: (ids: string[]) => Promise<unknown>,
) {
  const seen = new Map<string, string>(); // key → first id
  const toDelete: string[] = [];
  for (const r of rows) {
    const k = keyFn(r);
    if (seen.has(k)) toDelete.push(r.id);
    else seen.set(k, r.id);
  }
  if (toDelete.length === 0) {
    console.log(`  ${name.padEnd(25)} ✅ 0 duplicates`);
    return 0;
  }
  // Batch delete
  const BATCH = 500;
  for (let i = 0; i < toDelete.length; i += BATCH) {
    await deleteFn(toDelete.slice(i, i + BATCH));
  }
  console.log(`  ${name.padEnd(25)} 🗑️  ${toDelete.length} duplicates removed`);
  return toDelete.length;
}

async function main() {
  console.log("═══ DEDUPLICATING ═══\n");
  let total = 0;

  // Flashcard
  const fcs = await prisma.flashcard.findMany({
    select: { id: true, front: true, rama: true, libro: true, titulo: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("Flashcard", fcs, (r) => `${r.front}|${r.rama}|${r.libro}|${r.titulo}`,
    (ids) => prisma.flashcard.deleteMany({ where: { id: { in: ids } } }));

  // MCQ
  const mcqs = await prisma.mCQ.findMany({
    select: { id: true, question: true, rama: true, libro: true, titulo: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("MCQ", mcqs, (r) => `${r.question}|${r.rama}|${r.libro}|${r.titulo}`,
    (ids) => prisma.mCQ.deleteMany({ where: { id: { in: ids } } }));

  // TrueFalse
  const vfs = await prisma.trueFalse.findMany({
    select: { id: true, statement: true, rama: true, libro: true, titulo: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("TrueFalse", vfs, (r) => `${r.statement}|${r.rama}|${r.libro}|${r.titulo}`,
    (ids) => prisma.trueFalse.deleteMany({ where: { id: { in: ids } } }));

  // Definicion
  const defs = await prisma.definicion.findMany({
    select: { id: true, concepto: true, rama: true, libro: true, titulo: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("Definicion", defs, (r) => `${r.concepto}|${r.rama}|${r.libro}|${r.titulo}`,
    (ids) => prisma.definicion.deleteMany({ where: { id: { in: ids } } }));

  // FillBlank
  const fbs = await prisma.fillBlank.findMany({
    select: { id: true, textoConBlancos: true, rama: true, libro: true, titulo: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("FillBlank", fbs, (r) => `${r.textoConBlancos}|${r.rama}|${r.libro}|${r.titulo}`,
    (ids) => prisma.fillBlank.deleteMany({ where: { id: { in: ids } } }));

  // ErrorIdentification
  const eis = await prisma.errorIdentification.findMany({
    select: { id: true, textoConErrores: true, rama: true, libro: true, titulo: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("ErrorIdentification", eis, (r) => `${r.textoConErrores}|${r.rama}|${r.libro}|${r.titulo}`,
    (ids) => prisma.errorIdentification.deleteMany({ where: { id: { in: ids } } }));

  // OrderSequence
  const oss = await prisma.orderSequence.findMany({
    select: { id: true, titulo: true, rama: true, libro: true, tituloMateria: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("OrderSequence", oss, (r) => `${r.titulo}|${r.rama}|${r.libro}|${r.tituloMateria}`,
    (ids) => prisma.orderSequence.deleteMany({ where: { id: { in: ids } } }));

  // MatchColumns
  const mcs = await prisma.matchColumns.findMany({
    select: { id: true, titulo: true, rama: true, libro: true, tituloMateria: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("MatchColumns", mcs, (r) => `${r.titulo}|${r.rama}|${r.libro}|${r.tituloMateria}`,
    (ids) => prisma.matchColumns.deleteMany({ where: { id: { in: ids } } }));

  // CasoPractico
  const cps = await prisma.casoPractico.findMany({
    select: { id: true, titulo: true, hechos: true, rama: true, libro: true, tituloMateria: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("CasoPractico", cps, (r) => `${r.titulo}|${r.hechos.substring(0, 100)}|${r.rama}|${r.libro}|${r.tituloMateria}`,
    (ids) => prisma.casoPractico.deleteMany({ where: { id: { in: ids } } }));

  // Dictado
  const djs = await prisma.dictadoJuridico.findMany({
    select: { id: true, titulo: true, rama: true, libro: true, tituloMateria: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("DictadoJuridico", djs, (r) => `${r.titulo}|${r.rama}|${r.libro}|${r.tituloMateria}`,
    (ids) => prisma.dictadoJuridico.deleteMany({ where: { id: { in: ids } } }));

  // Timeline
  const tls = await prisma.timeline.findMany({
    select: { id: true, titulo: true, rama: true, libro: true, tituloMateria: true },
    orderBy: { id: "asc" },
  });
  total += await dedupe("Timeline", tls, (r) => `${r.titulo}|${r.rama}|${r.libro}|${r.tituloMateria}`,
    (ids) => prisma.timeline.deleteMany({ where: { id: { in: ids } } }));

  console.log(`\n  TOTAL REMOVED: ${total}\n`);
  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal:", e);
  process.exit(1);
});
