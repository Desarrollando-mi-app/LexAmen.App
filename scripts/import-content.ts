/**
 * Import study content from CSV files in content/csv/
 * Usage: npx tsx scripts/import-content.ts
 */

import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import * as fs from "fs";
import * as path from "path";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

// ─── CSV Parser ──────────────────────────────────────────

function parseCSV(text: string): Record<string, string>[] {
  const lines = text.split("\n").filter((l) => l.trim());
  if (lines.length < 2) return [];
  const headers = parseRow(lines[0]);
  return lines.slice(1).map((line) => {
    const vals = parseRow(line);
    const obj: Record<string, string> = {};
    headers.forEach((h, i) => (obj[h.trim()] = (vals[i] || "").trim()));
    return obj;
  });
}

function parseRow(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (c === "," && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current);
  return result;
}

// ─── Helpers ─────────────────────────────────────────────

const RAMA_TO_CODIGO: Record<string, string> = {
  DERECHO_CIVIL: "CODIGO_CIVIL",
  DERECHO_PROCESAL_CIVIL: "CODIGO_PROCEDIMIENTO_CIVIL",
  DERECHO_ORGANICO: "CODIGO_ORGANICO_TRIBUNALES",
};

const LIBRO_MAP: Record<string, string> = {
  COT: "LIBRO_COT",
  CPC_LIBRO_I: "LIBRO_I_CPC",
  CPC_LIBRO_II: "LIBRO_II_CPC",
  CPC_LIBRO_III: "LIBRO_III_CPC",
  CPC_LIBRO_IV: "LIBRO_IV_CPC",
};

/** Normalize libro value — map CSV aliases to enum values */
function normalizeLibro(libro: string): string {
  return LIBRO_MAP[libro] || libro;
}

const DIFICULTAD_MAP: Record<string, string> = {
  "1": "BASICO",
  "2": "INTERMEDIO",
  "3": "AVANZADO",
};

const OPTION_MAP: Record<string, string> = {
  "0": "A",
  "1": "B",
  "2": "C",
  "3": "D",
  a: "A",
  b: "B",
  c: "C",
  d: "D",
  A: "A",
  B: "B",
  C: "C",
  D: "D",
};

/** Fix JSON-like strings that use unquoted keys: {key:val} → {"key":"val"} */
function fixJSON(s: string): string {
  // Already valid JSON?
  try {
    JSON.parse(s);
    return s;
  } catch {
    // noop
  }

  // Replace unquoted keys and string values
  let fixed = s
    // Add quotes around keys: {key: → {"key":
    .replace(/([{,]\s*)([a-zA-Z_]\w*)\s*:/g, '$1"$2":')
    // Fix unquoted string values (not numbers, booleans, arrays, objects)
    .replace(/:\s*([^",\[\]{}\d][^,\[\]{}]*?)(\s*[,}\]])/g, (_, val, end) => {
      const trimmed = val.trim();
      if (
        trimmed === "true" ||
        trimmed === "false" ||
        trimmed === "null" ||
        !isNaN(Number(trimmed))
      ) {
        return `: ${trimmed}${end}`;
      }
      return `: "${trimmed}"${end}`;
    });

  try {
    JSON.parse(fixed);
    return fixed;
  } catch {
    // Last resort — return as-is
    return s;
  }
}

// ─── Importers ───────────────────────────────────────────

const stats: Record<string, { ok: number; err: number }> = {};

function initStats(type: string) {
  if (!stats[type]) stats[type] = { ok: 0, err: 0 };
}

async function importFlashcards(rows: Record<string, string>[]) {
  const type = "flashcards";
  initStats(type);
  for (const row of rows) {
    try {
      await prisma.flashcard.create({
        data: {
          front: row.pregunta,
          back: row.respuesta,
          rama: row.rama as any,
          codigo: (RAMA_TO_CODIGO[row.rama] || "CODIGO_CIVIL") as any,
          libro: normalizeLibro(row.libro || "TITULO_PRELIMINAR") as any,
          titulo: row.titulo || "",
          dificultad: DIFICULTAD_MAP[row.dificultad] || "BASICO",
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importMCQ(rows: Record<string, string>[]) {
  const type = "mcq";
  initStats(type);
  for (const row of rows) {
    try {
      await prisma.mCQ.create({
        data: {
          question: row.pregunta,
          optionA: row.opcion_a,
          optionB: row.opcion_b,
          optionC: row.opcion_c,
          optionD: row.opcion_d,
          correctOption: OPTION_MAP[row.correcta] || "A",
          explanation: row.explicacion || null,
          rama: row.rama as any,
          codigo: (RAMA_TO_CODIGO[row.rama] || "CODIGO_CIVIL") as any,
          libro: normalizeLibro(row.libro || "TITULO_PRELIMINAR") as any,
          titulo: row.titulo || "",
          dificultad: DIFICULTAD_MAP[row.dificultad] || "BASICO",
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importVF(rows: Record<string, string>[]) {
  const type = "vf";
  initStats(type);
  for (const row of rows) {
    try {
      const isTrue =
        row.respuesta === "true" ||
        row.respuesta === "1" ||
        row.respuesta.toLowerCase() === "verdadero";
      await prisma.trueFalse.create({
        data: {
          statement: row.afirmacion,
          isTrue,
          explanation: row.explicacion || null,
          rama: row.rama as any,
          codigo: (RAMA_TO_CODIGO[row.rama] || "CODIGO_CIVIL") as any,
          libro: normalizeLibro(row.libro || "TITULO_PRELIMINAR") as any,
          titulo: row.titulo || "",
          dificultad: DIFICULTAD_MAP[row.dificultad] || "BASICO",
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importDefiniciones(rows: Record<string, string>[]) {
  const type = "definiciones";
  initStats(type);

  // Collect all terminos first for distractors
  const allTerminos = rows.map((r) => r.termino).filter(Boolean);

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    try {
      // Generate 3 distractors from other terms in the same batch
      const others = allTerminos.filter((t) => t !== row.termino);
      const shuffled = others.sort(() => Math.random() - 0.5);
      const d1 = shuffled[0] || "Opción A";
      const d2 = shuffled[1] || "Opción B";
      const d3 = shuffled[2] || "Opción C";

      await prisma.definicion.create({
        data: {
          concepto: row.termino,
          definicion: row.definicion,
          rama: row.rama as any,
          libro: row.libro || null,
          titulo: row.titulo || null,
          distractor1: d1,
          distractor2: d2,
          distractor3: d3,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importFillBlank(rows: Record<string, string>[]) {
  const type = "fill_blank";
  initStats(type);
  for (const row of rows) {
    try {
      const blancos = fixJSON(row.blancos_json);
      await prisma.fillBlank.create({
        data: {
          textoConBlancos: row.textoConBlancos,
          blancos,
          explicacion: row.explicacion || null,
          rama: row.rama,
          libro: row.libro || null,
          titulo: row.titulo || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importErrorIdentification(rows: Record<string, string>[]) {
  const type = "error_identification";
  initStats(type);
  for (const row of rows) {
    try {
      // CSV has errores_json, schema expects segmentos
      // Convert errores format to segmentos format
      const erroresRaw = fixJSON(row.errores_json);
      let segmentos: string;

      try {
        const errores = JSON.parse(erroresRaw);
        // Split text into segments based on error positions
        // Simple approach: store the errores array as segmentos
        // The viewer will handle segmentation
        segmentos = JSON.stringify(errores);
      } catch {
        segmentos = erroresRaw;
      }

      await prisma.errorIdentification.create({
        data: {
          textoConErrores: row.textoConErrores,
          segmentos,
          totalErrores: parseInt(row.totalErrores) || 1,
          explicacionGeneral: row.explicacion || null,
          rama: row.rama,
          libro: row.libro || null,
          titulo: row.titulo || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importOrderSequence(rows: Record<string, string>[]) {
  const type = "order_sequence";
  initStats(type);
  for (const row of rows) {
    try {
      const items = fixJSON(row.items_json);
      await prisma.orderSequence.create({
        data: {
          titulo: row.titulo,
          instruccion: row.instruccion || null,
          items,
          explicacion: row.explicacion || null,
          rama: row.rama,
          libro: row.libro || null,
          tituloMateria: row.titulo_materia || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importMatchColumns(rows: Record<string, string>[]) {
  const type = "match_columns";
  initStats(type);
  for (const row of rows) {
    try {
      const pares = fixJSON(row.pares_json);
      await prisma.matchColumns.create({
        data: {
          titulo: row.titulo,
          columnaIzqLabel: row.columnaIzqLabel || "Concepto",
          columnaDerLabel: row.columnaDerLabel || "Definición",
          pares,
          explicacion: row.explicacion || null,
          rama: row.rama,
          libro: row.libro || null,
          tituloMateria: row.titulo_materia || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importCasoPractico(rows: Record<string, string>[]) {
  const type = "caso_practico";
  initStats(type);
  for (const row of rows) {
    try {
      const preguntas = fixJSON(row.preguntas_json);
      await prisma.casoPractico.create({
        data: {
          titulo: row.titulo,
          hechos: row.hechos,
          preguntas,
          resumenFinal: row.resumenFinal || null,
          rama: row.rama,
          libro: row.libro || null,
          tituloMateria: row.titulo_materia || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importDictado(rows: Record<string, string>[]) {
  const type = "dictado";
  initStats(type);
  for (const row of rows) {
    try {
      await prisma.dictadoJuridico.create({
        data: {
          titulo: row.titulo,
          textoCompleto: row.textoCompleto,
          rama: row.rama,
          libro: row.libro || null,
          tituloMateria: row.titulo_materia || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

async function importTimeline(rows: Record<string, string>[]) {
  const type = "timeline";
  initStats(type);
  for (const row of rows) {
    try {
      const eventos = fixJSON(row.eventos_json);
      await prisma.timeline.create({
        data: {
          titulo: row.titulo,
          instruccion: row.instruccion || null,
          eventos,
          escala: row.escala || "días",
          rangoMin: parseInt(row.rangoMin) || 0,
          rangoMax: parseInt(row.rangoMax) || 100,
          explicacion: row.explicacion || null,
          rama: row.rama,
          libro: row.libro || null,
          tituloMateria: row.titulo_materia || null,
          materia: row.materia || null,
          dificultad: parseInt(row.dificultad) || 2,
        },
      });
      stats[type].ok++;
    } catch (e: any) {
      stats[type].err++;
      console.error(`  [${type}] Error: ${e.message?.substring(0, 100)}`);
    }
  }
}

// ─── Main ────────────────────────────────────────────────

async function main() {
  const csvDir = path.resolve(process.argv[2] || "content/csv");

  if (!fs.existsSync(csvDir)) {
    console.error(`Directory not found: ${csvDir}`);
    process.exit(1);
  }

  const files = fs
    .readdirSync(csvDir)
    .filter((f) => f.endsWith(".csv"))
    .sort();

  console.log(`Found ${files.length} CSV files in ${csvDir}\n`);

  for (const file of files) {
    const filePath = path.join(csvDir, file);
    const text = fs.readFileSync(filePath, "utf8");
    const rows = parseCSV(text);

    if (rows.length === 0) {
      console.log(`  [SKIP] ${file} — empty`);
      continue;
    }

    // Detect module type from filename
    const match = file.match(
      /^sesion[\w-]+?_(flashcards|mcq|vf|definiciones|fill_blank|error_identification|order_sequence|match_columns|caso_practico|dictado|timeline)\.csv$/
    );

    if (!match) {
      console.log(`  [SKIP] ${file} — unknown type`);
      continue;
    }

    const moduleType = match[1];
    console.log(`  ${file} → ${moduleType} (${rows.length} rows)`);

    switch (moduleType) {
      case "flashcards":
        await importFlashcards(rows);
        break;
      case "mcq":
        await importMCQ(rows);
        break;
      case "vf":
        await importVF(rows);
        break;
      case "definiciones":
        await importDefiniciones(rows);
        break;
      case "fill_blank":
        await importFillBlank(rows);
        break;
      case "error_identification":
        await importErrorIdentification(rows);
        break;
      case "order_sequence":
        await importOrderSequence(rows);
        break;
      case "match_columns":
        await importMatchColumns(rows);
        break;
      case "caso_practico":
        await importCasoPractico(rows);
        break;
      case "dictado":
        await importDictado(rows);
        break;
      case "timeline":
        await importTimeline(rows);
        break;
    }
  }

  // Print summary
  console.log("\n═══ IMPORT SUMMARY ═══\n");
  let totalOk = 0;
  let totalErr = 0;
  for (const [type, s] of Object.entries(stats).sort()) {
    console.log(`  ${type.padEnd(25)} ✅ ${String(s.ok).padStart(4)}  ❌ ${String(s.err).padStart(3)}`);
    totalOk += s.ok;
    totalErr += s.err;
  }
  console.log(`  ${"─".repeat(45)}`);
  console.log(`  ${"TOTAL".padEnd(25)} ✅ ${String(totalOk).padStart(4)}  ❌ ${String(totalErr).padStart(3)}`);
  console.log();

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error("Fatal error:", e);
  process.exit(1);
});
