-- ─── Auto-OD-resumen para publicaciones largas ──────────────
--
-- Cada vez que un usuario publica un Análisis, Ensayo, Debate o
-- Expediente, generamos automáticamente un Obiter Dictum que actúa
-- como "tarjeta de presentación" en el feed principal del Diario.
-- La conversación (apoyos, respuestas, citas) sucede en el OD;
-- el contenido completo vive en el módulo correspondiente.

-- 1) ObiterDictum.kind: distingue OD regulares de OD-resumen automáticos.
--    Valores: 'regular' (default), 'analisis_summary', 'ensayo_summary',
--    'debate_summary', 'expediente_summary'.
ALTER TABLE "ObiterDictum"
  ADD COLUMN "kind" TEXT NOT NULL DEFAULT 'regular';

CREATE INDEX "ObiterDictum_kind_idx" ON "ObiterDictum" ("kind");

-- 2) FKs opcionales a Debate y Expediente. Análisis y Ensayo ya tenían
--    citedAnalisisId / citedEnsayoId, los reusamos.
ALTER TABLE "ObiterDictum"
  ADD COLUMN "citedDebateId" TEXT,
  ADD COLUMN "citedExpedienteId" TEXT;

CREATE INDEX "ObiterDictum_citedDebateId_idx"
  ON "ObiterDictum" ("citedDebateId");
CREATE INDEX "ObiterDictum_citedExpedienteId_idx"
  ON "ObiterDictum" ("citedExpedienteId");

-- ON DELETE SET NULL: si se borra el debate/expediente, el OD-resumen
-- queda como "publicación eliminada" pero no se rompe.
ALTER TABLE "ObiterDictum"
  ADD CONSTRAINT "ObiterDictum_citedDebateId_fkey"
  FOREIGN KEY ("citedDebateId") REFERENCES "DebateJuridico"("id")
  ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "ObiterDictum_citedExpedienteId_fkey"
  FOREIGN KEY ("citedExpedienteId") REFERENCES "Expediente"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
