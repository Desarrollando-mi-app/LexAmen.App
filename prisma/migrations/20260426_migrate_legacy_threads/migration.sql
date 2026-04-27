-- Migra los hilos legacy (cadenas de OD con threadId/threadOrder) al
-- modelo unificado parentObiterId. Cada parte n se vuelve hijo de la
-- parte n-1. La parte 1 (raíz) queda con parentObiterId = NULL.
--
-- Después: recalcula replyCount para todos los OD basándose en la
-- cantidad de hijos directos (parentObiterId = id).
--
-- Idempotente: solo actualiza ODs que aún no tienen parentObiterId,
-- así puede correrse múltiples veces sin duplicar.

-- 1. Cada parte 2+ del hilo apunta a la parte (n-1) del mismo threadId
UPDATE "ObiterDictum" AS child
SET "parentObiterId" = parent.id
FROM "ObiterDictum" AS parent
WHERE child."threadId" IS NOT NULL
  AND child."threadOrder" IS NOT NULL
  AND child."threadOrder" > 1
  AND child."parentObiterId" IS NULL
  AND parent."threadId" = child."threadId"
  AND parent."threadOrder" = child."threadOrder" - 1;

-- 2. Recalcula replyCount = COUNT(hijos directos) para TODO OD que
--    haya recibido al menos una respuesta. Se hace en un solo pass
--    para corregir cualquier desincronización previa.
UPDATE "ObiterDictum" AS p
SET "replyCount" = sub.cnt
FROM (
  SELECT "parentObiterId" AS pid, COUNT(*)::int AS cnt
  FROM "ObiterDictum"
  WHERE "parentObiterId" IS NOT NULL
  GROUP BY "parentObiterId"
) AS sub
WHERE p.id = sub.pid;
