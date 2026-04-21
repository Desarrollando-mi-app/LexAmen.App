#!/usr/bin/env tsx
/**
 * Fase 7-bis — Dimensionar rows con ramasAdicionales no vacío en los 11 modelos.
 * Solo lectura.
 */
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local", quiet: true, override: true });

const TABLES = [
  "Flashcard",
  "MCQ",
  "TrueFalse",
  "Definicion",
  "FillBlank",
  "ErrorIdentification",
  "OrderSequence",
  "MatchColumns",
  "CasoPractico",
  "DictadoJuridico",
  "Timeline",
];

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL missing");
  const client = new Client({ connectionString: url });
  await client.connect();

  console.log("Tabla               | total  | con_ramasAdic | con_sourceExId | dup_por_fase7bis");
  console.log("--------------------|-------:|--------------:|---------------:|-----------------:");

  let totalDup = 0;

  for (const t of TABLES) {
    const [total, withExtra, withSrc] = await Promise.all([
      client.query(`SELECT COUNT(*)::int AS n FROM "${t}"`),
      client.query(
        `SELECT COUNT(*)::int AS n, COALESCE(SUM(array_length("ramasAdicionales", 1)), 0)::int AS totalExtra
         FROM "${t}" WHERE array_length("ramasAdicionales", 1) > 0`,
      ),
      client.query(
        `SELECT COUNT(*)::int AS n FROM "${t}" WHERE "sourceExerciseId" IS NOT NULL`,
      ),
    ]);
    const n = total.rows[0].n;
    const we = withExtra.rows[0].n;
    const te = withExtra.rows[0].totalextra;
    const ws = withSrc.rows[0].n;
    totalDup += te;
    console.log(
      `${t.padEnd(19)} | ${String(n).padStart(6)} | ${String(we).padStart(13)} | ${String(ws).padStart(14)} | ${String(te).padStart(16)}`,
    );
  }

  console.log(`\nTotal filas nuevas que crearía Fase 7-bis: ${totalDup}`);

  await client.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
