import fs from "fs";
import path from "path";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

// Cargar variables de entorno
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// ─── Parser CSV manual (respeta comillas, comas internas y campos multilínea) ──

function parseCSVRecords(content: string): string[][] {
  const records: string[][] = [];
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < content.length) {
    const char = content[i];

    if (inQuotes) {
      if (char === '"') {
        // Comilla doble escapada ""
        if (i + 1 < content.length && content[i + 1] === '"') {
          current += '"';
          i += 2;
          continue;
        } else {
          inQuotes = false;
          i++;
          continue;
        }
      } else {
        // Dentro de comillas: aceptar cualquier carácter incluyendo \n
        current += char;
        i++;
        continue;
      }
    }

    // Fuera de comillas
    if (char === '"') {
      inQuotes = true;
      i++;
    } else if (char === ",") {
      fields.push(current.trim());
      current = "";
      i++;
    } else if (char === "\n" || char === "\r") {
      // Fin de registro
      fields.push(current.trim());
      current = "";
      // Saltar \r\n
      if (char === "\r" && i + 1 < content.length && content[i + 1] === "\n") {
        i++;
      }
      i++;
      if (fields.some((f) => f !== "")) {
        records.push([...fields]);
      }
      fields.length = 0;
    } else {
      current += char;
      i++;
    }
  }

  // Última fila si no termina en newline
  if (current || fields.length > 0) {
    fields.push(current.trim());
    if (fields.some((f) => f !== "")) {
      records.push([...fields]);
    }
  }

  return records;
}

async function main() {
  const csvFile = process.argv[2] || "universo_unificado_civil1.csv";
  const csvPath = path.resolve(__dirname, "..", csvFile);
  console.log(`📂 Archivo: ${csvFile}`);
  const content = fs.readFileSync(csvPath, "utf-8");

  const records = parseCSVRecords(content);

  // Primera fila es el header
  const header = records[0];
  console.log("📋 Columnas:", header.join(", "));

  // Parsear filas
  const rows = [];
  let skipped = 0;

  for (let i = 1; i < records.length; i++) {
    const fields = records[i];

    if (fields.length < 7) {
      skipped++;
      console.warn(`⚠️  Registro ${i} tiene ${fields.length} campos, se omite.`);
      continue;
    }

    const [front, back, unidad, materia, submateria, tipo, nivel] = fields;

    if (!front || !back) {
      skipped++;
      console.warn(`⚠️  Registro ${i} tiene front o back vacío, se omite.`);
      continue;
    }

    // Limpiar saltos de línea internos: reemplazar con espacio
    rows.push({
      front: front.replace(/\n/g, " ").replace(/\s+/g, " "),
      back: back.replace(/\n/g, " ").replace(/\s+/g, " "),
      unidad: unidad || "DERECHO_CIVIL_1",
      materia: materia || "TEORIA_DE_LA_LEY",
      submateria: submateria || "LA_LEY",
      tipo: tipo === "PROCESAL" ? "PROCESAL" as const : "CIVIL" as const,
      nivel: nivel || "BASICO",
    });
  }

  console.log(`\n📊 Total filas parseadas: ${rows.length}`);
  if (skipped > 0) console.log(`⚠️  Filas omitidas: ${skipped}`);

  // Insertar en BD
  console.log("\n🌱 Insertando flashcards...");
  const result = await prisma.flashcard.createMany({
    data: rows,
    skipDuplicates: true,
  });

  console.log(`✅ ${result.count} flashcards insertadas exitosamente.`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
