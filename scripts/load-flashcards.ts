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

// ─── Parser CSV manual (respeta comillas y comas internas) ──

function parseCSVLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (inQuotes) {
      if (char === '"') {
        // Comilla doble escapada ""
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
  }

  fields.push(current.trim());
  return fields;
}

async function main() {
  const csvPath = path.resolve(__dirname, "../universo_unificado_civil1.csv");
  const content = fs.readFileSync(csvPath, "utf-8");
  const lines = content.split("\n").filter((l) => l.trim() !== "");

  // Primera línea es el header
  const header = parseCSVLine(lines[0]);
  console.log("📋 Columnas:", header.join(", "));

  // Parsear filas
  const rows = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const fields = parseCSVLine(lines[i]);

    if (fields.length < 7) {
      skipped++;
      console.warn(`⚠️  Línea ${i + 1} tiene ${fields.length} campos, se omite.`);
      continue;
    }

    const [front, back, unidad, materia, submateria, tipo, nivel] = fields;

    if (!front || !back) {
      skipped++;
      console.warn(`⚠️  Línea ${i + 1} tiene front o back vacío, se omite.`);
      continue;
    }

    rows.push({
      front,
      back,
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
