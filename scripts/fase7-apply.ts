#!/usr/bin/env tsx
/**
 * Fase 7 — Apply script
 *
 * Lee outputs/fase-7-rank-FINAL.csv (o --file=...) y popula la columna
 * "ramasAdicionales" en los modelos de ejercicios para las filas con
 * aplica=true.
 *
 * Es idempotente: usa array_append + guard "NOT ANY" para no duplicar.
 *
 * Uso:
 *   npx tsx scripts/fase7-apply.ts --dry-run        # solo reporta
 *   npx tsx scripts/fase7-apply.ts                  # aplica cambios
 *   npx tsx scripts/fase7-apply.ts --file=path.csv  # otro CSV
 */

import fs from "node:fs";
import path from "node:path";
import dotenv from "dotenv";
import { Client } from "pg";

dotenv.config({ path: ".env.local", quiet: true, override: true });

const args = process.argv.slice(2);
const DRY_RUN = args.includes("--dry-run");
const fileArg = args.find((a) => a.startsWith("--file="));
const CSV_PATH = path.resolve(
  fileArg ? fileArg.slice("--file=".length) : "outputs/fase-7-rank-FINAL.csv",
);

// Mapeo modelo CSV → tabla Postgres (PascalCase). Todos los 4 modelos activos
// usan el enum "Rama" (no TEXT[]), así que casteamos a "Rama".
const MODEL_TO_TABLE: Record<string, string> = {
  flashcard: "Flashcard",
  mcq: "MCQ",
  trueFalse: "TrueFalse",
  definicion: "Definicion",
};

type Row = {
  model: string;
  id: string;
  own_rama: string;
  target_rama: string;
  aplica: string;
  confidence: string;
  razon: string;
  source: string;
};

// ──────────────────────────────────────────────────────────────────────────
// CSV parser (RFC-4180 simplificado: respeta comillas dobles y escapes "")
// ──────────────────────────────────────────────────────────────────────────
function parseCSV(text: string): Row[] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cell += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        row.push(cell);
        cell = "";
      } else if (ch === "\n") {
        row.push(cell);
        lines.push(row);
        row = [];
        cell = "";
      } else if (ch === "\r") {
        // skip
      } else {
        cell += ch;
      }
    }
  }
  if (cell.length || row.length) {
    row.push(cell);
    lines.push(row);
  }

  const [header, ...rest] = lines;
  return rest
    .filter((r) => r.length > 1)
    .map((r) => {
      const o: Record<string, string> = {};
      header.forEach((h, i) => (o[h] = r[i] ?? ""));
      return o as unknown as Row;
    });
}

async function main() {
  if (!fs.existsSync(CSV_PATH)) {
    console.error(`ERROR: no encontré ${CSV_PATH}`);
    process.exit(1);
  }

  const text = fs.readFileSync(CSV_PATH, "utf8");
  const rows = parseCSV(text);
  const trueRows = rows.filter((r) => r.aplica === "true");

  // Agrupar por modelo
  const byModel = new Map<string, Row[]>();
  for (const r of trueRows) {
    if (!byModel.has(r.model)) byModel.set(r.model, []);
    byModel.get(r.model)!.push(r);
  }

  console.log(`\n📊 Fase 7 — Apply`);
  console.log(`CSV: ${path.relative(process.cwd(), CSV_PATH)}`);
  console.log(`Total filas CSV: ${rows.length}`);
  console.log(`Filas aplica=true: ${trueRows.length}`);
  console.log(`Modo: ${DRY_RUN ? "DRY-RUN (solo reporta)" : "APLICAR"}\n`);

  for (const [model, list] of byModel) {
    console.log(`  ${model.padEnd(12)} → ${list.length} updates`);
  }
  console.log("");

  // Validar modelos
  const unknown = [...byModel.keys()].filter((m) => !MODEL_TO_TABLE[m]);
  if (unknown.length) {
    console.error(`ERROR: modelos no mapeados: ${unknown.join(", ")}`);
    process.exit(1);
  }

  if (DRY_RUN) {
    console.log("✓ Dry-run completo. Re-ejecutar sin --dry-run para aplicar.");
    return;
  }

  // Conectar
  const url = process.env.DIRECT_URL || process.env.DATABASE_URL;
  if (!url) {
    console.error("ERROR: ni DIRECT_URL ni DATABASE_URL definidos");
    process.exit(1);
  }
  const client = new Client({
    connectionString: url,
    ssl: { rejectUnauthorized: false },
  });
  await client.connect();

  const summary: Record<string, { updated: number; already: number; missing: number }> = {};

  try {
    await client.query("BEGIN");

    for (const [model, list] of byModel) {
      const table = MODEL_TO_TABLE[model];
      let updated = 0;
      let already = 0;
      let missing = 0;

      for (const r of list) {
        // Idempotente: solo agrega si target_rama no está ya en el array.
        // Devuelve el id si la fila existe (para detectar IDs huérfanos).
        const q = `
          WITH target AS (
            SELECT id, "ramasAdicionales"
            FROM "${table}"
            WHERE id = $1
          )
          UPDATE "${table}" t
          SET "ramasAdicionales" = array_append(t."ramasAdicionales", $2::"Rama")
          FROM target
          WHERE t.id = target.id
            AND NOT ($2::"Rama" = ANY(target."ramasAdicionales"))
          RETURNING t.id
        `;
        const res = await client.query(q, [r.id, r.target_rama]);

        if (res.rowCount && res.rowCount > 0) {
          updated++;
        } else {
          // Puede ser: ya estaba, o el id no existe
          const existRes = await client.query(
            `SELECT 1 FROM "${table}" WHERE id = $1`,
            [r.id],
          );
          if (existRes.rowCount) already++;
          else missing++;
        }
      }

      summary[model] = { updated, already, missing };
      console.log(
        `  ✓ ${model.padEnd(12)} updated=${updated.toString().padStart(3)} already=${already.toString().padStart(2)} missing=${missing}`,
      );
    }

    await client.query("COMMIT");
    console.log("\n✅ Commit OK.\n");

    // Totales
    const totals = Object.values(summary).reduce(
      (a, s) => ({
        updated: a.updated + s.updated,
        already: a.already + s.already,
        missing: a.missing + s.missing,
      }),
      { updated: 0, already: 0, missing: 0 },
    );
    console.log(
      `📈 Totales: ${totals.updated} updated · ${totals.already} ya tenían · ${totals.missing} IDs faltantes`,
    );
  } catch (e) {
    await client.query("ROLLBACK");
    console.error("❌ ROLLBACK:", (e as Error).message);
    process.exit(1);
  } finally {
    await client.end();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
