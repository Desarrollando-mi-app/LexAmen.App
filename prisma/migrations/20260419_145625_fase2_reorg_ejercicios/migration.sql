-- AlterTable
ALTER TABLE "CasoPractico" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "Definicion" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "DictadoJuridico" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "ErrorIdentification" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "FillBlank" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "Flashcard" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "MCQ" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "MatchColumns" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "OrderSequence" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "Timeline" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "parrafo" TEXT,
ADD COLUMN     "sourceExerciseId" TEXT;

-- AlterTable
ALTER TABLE "TrueFalse" ADD COLUMN     "esIntegrador" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "sourceExerciseId" TEXT;

-- CreateIndex
CREATE INDEX "CasoPractico_rama_libro_tituloMateria_parrafo_idx" ON "CasoPractico"("rama", "libro", "tituloMateria", "parrafo");

-- CreateIndex
CREATE INDEX "CasoPractico_esIntegrador_idx" ON "CasoPractico"("esIntegrador");

-- CreateIndex
CREATE INDEX "CasoPractico_sourceExerciseId_idx" ON "CasoPractico"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "Definicion_rama_libro_titulo_parrafo_idx" ON "Definicion"("rama", "libro", "titulo", "parrafo");

-- CreateIndex
CREATE INDEX "Definicion_esIntegrador_idx" ON "Definicion"("esIntegrador");

-- CreateIndex
CREATE INDEX "Definicion_sourceExerciseId_idx" ON "Definicion"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "DictadoJuridico_rama_libro_tituloMateria_parrafo_idx" ON "DictadoJuridico"("rama", "libro", "tituloMateria", "parrafo");

-- CreateIndex
CREATE INDEX "DictadoJuridico_esIntegrador_idx" ON "DictadoJuridico"("esIntegrador");

-- CreateIndex
CREATE INDEX "DictadoJuridico_sourceExerciseId_idx" ON "DictadoJuridico"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "ErrorIdentification_rama_libro_titulo_parrafo_idx" ON "ErrorIdentification"("rama", "libro", "titulo", "parrafo");

-- CreateIndex
CREATE INDEX "ErrorIdentification_esIntegrador_idx" ON "ErrorIdentification"("esIntegrador");

-- CreateIndex
CREATE INDEX "ErrorIdentification_sourceExerciseId_idx" ON "ErrorIdentification"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "FillBlank_rama_libro_titulo_parrafo_idx" ON "FillBlank"("rama", "libro", "titulo", "parrafo");

-- CreateIndex
CREATE INDEX "FillBlank_esIntegrador_idx" ON "FillBlank"("esIntegrador");

-- CreateIndex
CREATE INDEX "FillBlank_sourceExerciseId_idx" ON "FillBlank"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "Flashcard_rama_libro_titulo_parrafo_idx" ON "Flashcard"("rama", "libro", "titulo", "parrafo");

-- CreateIndex
CREATE INDEX "Flashcard_esIntegrador_idx" ON "Flashcard"("esIntegrador");

-- CreateIndex
CREATE INDEX "Flashcard_sourceExerciseId_idx" ON "Flashcard"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "MCQ_rama_libro_titulo_parrafo_idx" ON "MCQ"("rama", "libro", "titulo", "parrafo");

-- CreateIndex
CREATE INDEX "MCQ_esIntegrador_idx" ON "MCQ"("esIntegrador");

-- CreateIndex
CREATE INDEX "MCQ_sourceExerciseId_idx" ON "MCQ"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "MatchColumns_rama_libro_tituloMateria_parrafo_idx" ON "MatchColumns"("rama", "libro", "tituloMateria", "parrafo");

-- CreateIndex
CREATE INDEX "MatchColumns_esIntegrador_idx" ON "MatchColumns"("esIntegrador");

-- CreateIndex
CREATE INDEX "MatchColumns_sourceExerciseId_idx" ON "MatchColumns"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "OrderSequence_rama_libro_tituloMateria_parrafo_idx" ON "OrderSequence"("rama", "libro", "tituloMateria", "parrafo");

-- CreateIndex
CREATE INDEX "OrderSequence_esIntegrador_idx" ON "OrderSequence"("esIntegrador");

-- CreateIndex
CREATE INDEX "OrderSequence_sourceExerciseId_idx" ON "OrderSequence"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "Timeline_rama_libro_tituloMateria_parrafo_idx" ON "Timeline"("rama", "libro", "tituloMateria", "parrafo");

-- CreateIndex
CREATE INDEX "Timeline_esIntegrador_idx" ON "Timeline"("esIntegrador");

-- CreateIndex
CREATE INDEX "Timeline_sourceExerciseId_idx" ON "Timeline"("sourceExerciseId");

-- CreateIndex
CREATE INDEX "TrueFalse_rama_libro_titulo_parrafo_idx" ON "TrueFalse"("rama", "libro", "titulo", "parrafo");

-- CreateIndex
CREATE INDEX "TrueFalse_esIntegrador_idx" ON "TrueFalse"("esIntegrador");

-- CreateIndex
CREATE INDEX "TrueFalse_sourceExerciseId_idx" ON "TrueFalse"("sourceExerciseId");
