-- 1. Convertir submateria de enum Submateria a TEXT
ALTER TABLE "Flashcard" ALTER COLUMN "submateria" TYPE TEXT USING "submateria"::TEXT;

-- 2. Agregar campos unidad y materia
ALTER TABLE "Flashcard" ADD COLUMN "unidad" TEXT NOT NULL DEFAULT 'DERECHO_CIVIL_1';
ALTER TABLE "Flashcard" ADD COLUMN "materia" TEXT NOT NULL DEFAULT 'TEORIA_DE_LA_LEY';

-- 3. Actualizar datos existentes: flashcards procesales
UPDATE "Flashcard" SET
  unidad = 'DERECHO_PROCESAL_CIVIL_1',
  materia = 'JURISDICCION_Y_COMPETENCIA'
WHERE submateria = 'JURISDICCION';
