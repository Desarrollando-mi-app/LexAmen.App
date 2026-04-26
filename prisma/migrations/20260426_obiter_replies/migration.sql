-- ObiterDictum.parentObiterId — FK opcional al OD padre cuando este OD es
-- una respuesta. Una respuesta es un OD completo (mismo modelo) que apunta
-- a su padre. Esto unifica el concepto de "comentario" y "continuar hilo":
-- un hilo de autor es simplemente una cadena de auto-respuestas.
--
-- ON DELETE: CASCADE — si se borra el padre, se borran las respuestas.
-- (Coherente con borrar todo el hilo si se borra la raíz.)

ALTER TABLE "ObiterDictum" ADD COLUMN "parentObiterId" TEXT;

-- Contador desnormalizado de respuestas directas (no recursivo).
ALTER TABLE "ObiterDictum" ADD COLUMN "replyCount" INTEGER NOT NULL DEFAULT 0;

-- Índice para listar rápidamente las respuestas de un OD.
CREATE INDEX "ObiterDictum_parentObiterId_createdAt_idx"
  ON "ObiterDictum" ("parentObiterId", "createdAt" ASC);

-- FK con CASCADE — borrar un OD elimina toda su descendencia.
ALTER TABLE "ObiterDictum"
  ADD CONSTRAINT "ObiterDictum_parentObiterId_fkey"
  FOREIGN KEY ("parentObiterId") REFERENCES "ObiterDictum"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
