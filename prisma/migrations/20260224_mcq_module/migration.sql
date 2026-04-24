-- =============================================
-- MCQ Module Migration
-- =============================================

-- 1. Agregar xp a User
ALTER TABLE "User" ADD COLUMN "xp" INTEGER NOT NULL DEFAULT 0;

-- 2. Convertir MCQ.submateria de enum Submateria a TEXT
ALTER TABLE "MCQ" ALTER COLUMN "submateria" TYPE TEXT USING "submateria"::TEXT;

-- 3. Agregar campos unidad, materia y nivel a MCQ
ALTER TABLE "MCQ" ADD COLUMN "unidad" TEXT NOT NULL DEFAULT 'DERECHO_CIVIL_1';
ALTER TABLE "MCQ" ADD COLUMN "materia" TEXT NOT NULL DEFAULT 'TEORIA_DE_LA_LEY';
ALTER TABLE "MCQ" ADD COLUMN "nivel" TEXT NOT NULL DEFAULT 'BASICO';

-- 4. Actualizar MCQs procesales existentes (si los hay)
UPDATE "MCQ" SET
  unidad = 'DERECHO_PROCESAL_CIVIL_1',
  materia = 'JURISDICCION_Y_COMPETENCIA'
WHERE submateria IN ('JURISDICCION', 'COMPETENCIA', 'JUICIO_ORDINARIO', 'RECURSOS', 'JUICIO_EJECUTIVO');

-- 5. Liberar la dependencia de Flashcard.submateria sobre el enum
--    (la conversión "oficial" vive en la migración siguiente; acá sólo
--     sacamos el type-binding para poder dropear el enum sin romper el
--     shadow DB. Es idempotente: si ya es TEXT, es no-op.)
ALTER TABLE "Flashcard" ALTER COLUMN "submateria" TYPE TEXT USING "submateria"::TEXT;

-- 6. Eliminar enum Submateria (ya no lo usa ningún modelo)
DROP TYPE IF EXISTS "Submateria";
