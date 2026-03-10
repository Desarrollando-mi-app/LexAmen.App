import readline from "readline";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

// Ejemplo: eliminar flashcards de títulos específicos
const DELETE_TITULOS: string[] = [
  // Agregar títulos a eliminar aquí
  // "PERSONA_NATURAL",
  // "MUERTE_PRESUNTA",
];

function ask(question: string): Promise<string> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  if (DELETE_TITULOS.length === 0) {
    console.log("⚠️  No hay títulos configurados para eliminar. Edita DELETE_TITULOS en el script.");
    return;
  }

  // Contar flashcards a eliminar
  const toDelete = await prisma.flashcard.count({
    where: { titulo: { in: DELETE_TITULOS } },
  });

  const total = await prisma.flashcard.count();

  console.log(`\n📊 Total flashcards en BD: ${total}`);
  console.log(`🗑️  Flashcards en títulos a eliminar: ${toDelete}`);
  console.log(`✅ Flashcards que se conservan: ${total - toDelete}`);

  if (toDelete === 0) {
    console.log("\n✅ No hay flashcards que eliminar.");
    return;
  }

  // Mostrar desglose por título
  const groups = await prisma.flashcard.groupBy({
    by: ["titulo"],
    where: { titulo: { in: DELETE_TITULOS } },
    _count: { id: true },
  });

  console.log("\n📋 Desglose de flashcards a eliminar:");
  for (const g of groups) {
    console.log(`   - ${g.titulo}: ${g._count.id}`);
  }

  // Pedir confirmación
  const answer = await ask(
    `\nSe eliminarán ${toDelete} flashcards. Escribe CONFIRMAR para continuar: `
  );

  if (answer !== "CONFIRMAR") {
    console.log("❌ Operación cancelada.");
    return;
  }

  // 1. Eliminar UserFlashcardProgress huérfanos
  const deletedProgress = await prisma.userFlashcardProgress.deleteMany({
    where: { flashcard: { titulo: { in: DELETE_TITULOS } } },
  });
  console.log(
    `\n🧹 UserFlashcardProgress eliminados: ${deletedProgress.count}`
  );

  // 2. Eliminar flashcards
  const deletedFlashcards = await prisma.flashcard.deleteMany({
    where: { titulo: { in: DELETE_TITULOS } },
  });
  console.log(`🗑️  Flashcards eliminadas: ${deletedFlashcards.count}`);

  // 3. Mostrar estado final
  const remaining = await prisma.flashcard.count();
  console.log(`\n✅ Flashcards restantes en BD: ${remaining}`);
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
