-- AlterTable: Add ramasAdicionales to 11 exercise models.
-- Additive, non-destructive. All existing rows get empty array default.
-- Rama[] for models using the Rama enum; TEXT[] for the newer models using String[].

ALTER TABLE "Flashcard"           ADD COLUMN "ramasAdicionales" "Rama"[] DEFAULT ARRAY[]::"Rama"[];
ALTER TABLE "MCQ"                 ADD COLUMN "ramasAdicionales" "Rama"[] DEFAULT ARRAY[]::"Rama"[];
ALTER TABLE "TrueFalse"           ADD COLUMN "ramasAdicionales" "Rama"[] DEFAULT ARRAY[]::"Rama"[];
ALTER TABLE "Definicion"          ADD COLUMN "ramasAdicionales" "Rama"[] DEFAULT ARRAY[]::"Rama"[];

ALTER TABLE "FillBlank"           ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "ErrorIdentification" ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "OrderSequence"       ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "MatchColumns"        ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "CasoPractico"        ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "DictadoJuridico"     ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Timeline"            ADD COLUMN "ramasAdicionales" TEXT[] DEFAULT ARRAY[]::TEXT[];
