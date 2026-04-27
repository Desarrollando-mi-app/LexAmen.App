-- Hashtags: array de strings (lowercase) extraídos del content al
-- crear el OD. Permite filtrar feed por #tag y calcular trending.
-- GIN index para queries con "any of these tags" rápidas.
ALTER TABLE "ObiterDictum"
  ADD COLUMN "hashtags" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX "ObiterDictum_hashtags_gin"
  ON "ObiterDictum" USING GIN ("hashtags");

-- Menciones: array de userIds extraídos del content (@usuario) al
-- crear el OD. Sirve para notificar a los mencionados y para
-- mostrar links rápidos en perfiles.
ALTER TABLE "ObiterDictum"
  ADD COLUMN "mentionedUserIds" TEXT[] NOT NULL DEFAULT '{}';

CREATE INDEX "ObiterDictum_mentionedUserIds_gin"
  ON "ObiterDictum" USING GIN ("mentionedUserIds");

-- Handle único en User para resolver @menciones a un userId real.
-- Lo derivamos del firstName en lowercase como base; el usuario lo
-- podrá personalizar después en su perfil.
-- Defensive: si la columna ya existe (por si se aplica dos veces),
-- no rompe gracias al IF NOT EXISTS.
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "handle" TEXT;

-- Index único parcial — solo hace cumplir unicidad cuando no es NULL,
-- así no romper para usuarios sin handle todavía.
CREATE UNIQUE INDEX IF NOT EXISTS "User_handle_unique"
  ON "User" ("handle")
  WHERE "handle" IS NOT NULL;

-- Backfill inicial: handle = lowercase(firstName) + sufijo numérico
-- si hay colisiones. Hacemos esto solo para usuarios sin handle.
-- Usamos ROW_NUMBER para resolver duplicados deterministicamente.
WITH candidates AS (
  SELECT
    id,
    LOWER(REGEXP_REPLACE(COALESCE("firstName", ''), '[^a-z0-9]', '', 'gi')) AS base,
    ROW_NUMBER() OVER (
      PARTITION BY LOWER(REGEXP_REPLACE(COALESCE("firstName", ''), '[^a-z0-9]', '', 'gi'))
      ORDER BY "createdAt" ASC
    ) AS rn
  FROM "User"
  WHERE "handle" IS NULL
)
UPDATE "User" u
SET "handle" = CASE
  WHEN c.base = '' THEN 'usuario' || SUBSTRING(u.id, 1, 6)
  WHEN c.rn = 1 THEN c.base
  ELSE c.base || (c.rn - 1)::TEXT
END
FROM candidates c
WHERE u.id = c.id;
