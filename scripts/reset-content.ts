/**
 * Reset Content Script
 * Borra todo el contenido de estudio y progreso de usuarios.
 * Ejecutar con: npx tsx scripts/reset-content.ts
 */
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🗑️  Iniciando reset de contenido...\n");

  // 1. Borrar progreso de usuarios (FK → Flashcard/MCQ/TF)
  const p1 = await prisma.userFlashcardProgress.deleteMany({});
  console.log(`  ✓ UserFlashcardProgress: ${p1.count} eliminados`);

  const p2 = await prisma.flashcardFavorite.deleteMany({});
  console.log(`  ✓ FlashcardFavorite: ${p2.count} eliminados`);

  const p3 = await prisma.userMCQAttempt.deleteMany({});
  console.log(`  ✓ UserMCQAttempt: ${p3.count} eliminados`);

  const p4 = await prisma.userTrueFalseAttempt.deleteMany({});
  console.log(`  ✓ UserTrueFalseAttempt: ${p4.count} eliminados`);

  const p5 = await prisma.curriculumProgress.deleteMany({});
  console.log(`  ✓ CurriculumProgress: ${p5.count} eliminados`);

  // 2. Borrar respuestas de causas que referencian MCQ
  const p6 = await prisma.causaRoomAnswer.deleteMany({});
  console.log(`  ✓ CausaRoomAnswer: ${p6.count} eliminados`);

  const p7 = await prisma.causaRoomQuestion.deleteMany({});
  console.log(`  ✓ CausaRoomQuestion: ${p7.count} eliminados`);

  const p8 = await prisma.causaAnswer.deleteMany({});
  console.log(`  ✓ CausaAnswer: ${p8.count} eliminados`);

  // 3. Borrar contenido
  const p9 = await prisma.flashcard.deleteMany({});
  console.log(`  ✓ Flashcard: ${p9.count} eliminados`);

  const p10 = await prisma.mCQ.deleteMany({});
  console.log(`  ✓ MCQ: ${p10.count} eliminados`);

  const p11 = await prisma.trueFalse.deleteMany({});
  console.log(`  ✓ TrueFalse: ${p11.count} eliminados`);

  console.log("\n✅ Reset completado exitosamente.");
  console.log("   BD con 0 flashcards, 0 MCQ, 0 TrueFalse.");
}

main()
  .catch((e) => {
    console.error("❌ Error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
