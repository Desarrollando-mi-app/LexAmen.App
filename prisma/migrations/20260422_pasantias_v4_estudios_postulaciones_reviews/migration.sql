-- Pasantías V4 — Estudios Jurídicos, Postulaciones y Reseñas balanceadas.
--
-- 1) Extiende `Pasantia` con campos estructurados (tipo OFREZCO/BUSCO,
--    vínculo con estudio, jornada, fechas, cupos, requisitos mínimos,
--    canales de postulación interna/externa y contactos directos).
-- 2) Crea el modelo de Estudio Jurídico con flujo de verificación por admin
--    y su tabla de miembros (socios/asociados/pasantes).
-- 3) Crea `PasantiaPostulacion` (postulación interna con CV y carta opcional).
-- 4) Crea `PasantiaReview` — reseñas balanceadas: sólo el ex-pasante de una
--    postulación COMPLETADA puede reseñar; el estudio puede responder
--    públicamente una sola vez y reportar para moderación (no eliminar).
--
-- Backfill: todos los registros `Pasantia` existentes se marcan como
-- `type = 'ofrezco'` (comportamiento histórico).

-- ── Extender Pasantia ───────────────────────────────────
ALTER TABLE "Pasantia" ADD COLUMN "type" TEXT NOT NULL DEFAULT 'ofrezco';
ALTER TABLE "Pasantia" ADD COLUMN "estudioId" TEXT;
ALTER TABLE "Pasantia" ADD COLUMN "jornada" TEXT;
ALTER TABLE "Pasantia" ADD COLUMN "fechaInicio" TIMESTAMP(3);
ALTER TABLE "Pasantia" ADD COLUMN "fechaLimite" TIMESTAMP(3);
ALTER TABLE "Pasantia" ADD COLUMN "cupos" INTEGER;
ALTER TABLE "Pasantia" ADD COLUMN "anioMinimoCarrera" INTEGER;
ALTER TABLE "Pasantia" ADD COLUMN "promedioMinimo" DOUBLE PRECISION;
ALTER TABLE "Pasantia" ADD COLUMN "areasRequeridas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
ALTER TABLE "Pasantia" ADD COLUMN "postulacionTipo" TEXT;
ALTER TABLE "Pasantia" ADD COLUMN "postulacionUrl" TEXT;
ALTER TABLE "Pasantia" ADD COLUMN "contactoWhatsapp" TEXT;
ALTER TABLE "Pasantia" ADD COLUMN "contactoEmail" TEXT;

-- Backfill explícito por si algún registro escapó al default (idempotente).
UPDATE "Pasantia" SET "type" = 'ofrezco' WHERE "type" IS NULL OR "type" = '';

CREATE INDEX "Pasantia_estudioId_idx" ON "Pasantia"("estudioId");
CREATE INDEX "Pasantia_type_isActive_isHidden_createdAt_idx"
  ON "Pasantia"("type", "isActive", "isHidden", "createdAt" DESC);

-- ── EstudioJuridico ─────────────────────────────────────
CREATE TABLE "EstudioJuridico" (
  "id" TEXT NOT NULL,
  "slug" TEXT NOT NULL,
  "nombre" TEXT NOT NULL,
  "logoUrl" TEXT,
  "coverUrl" TEXT,
  "sitioWeb" TEXT,
  "tamano" TEXT,
  "fundacion" INTEGER,
  "descripcion" TEXT,
  "areas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "region" TEXT,
  "ciudad" TEXT,
  "direccion" TEXT,
  "verificado" BOOLEAN NOT NULL DEFAULT false,
  "verifiedAt" TIMESTAMP(3),
  "verifiedBy" TEXT,
  "rejectionNote" TEXT,
  "createdById" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "EstudioJuridico_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstudioJuridico_slug_key" ON "EstudioJuridico"("slug");
CREATE INDEX "EstudioJuridico_verificado_idx" ON "EstudioJuridico"("verificado");
CREATE INDEX "EstudioJuridico_region_idx" ON "EstudioJuridico"("region");

ALTER TABLE "EstudioJuridico" ADD CONSTRAINT "EstudioJuridico_createdById_fkey"
  FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pasantia" ADD CONSTRAINT "Pasantia_estudioId_fkey"
  FOREIGN KEY ("estudioId") REFERENCES "EstudioJuridico"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── EstudioMember ───────────────────────────────────────
CREATE TABLE "EstudioMember" (
  "id" TEXT NOT NULL,
  "estudioId" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "rol" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EstudioMember_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "EstudioMember_estudioId_userId_key"
  ON "EstudioMember"("estudioId", "userId");
CREATE INDEX "EstudioMember_userId_idx" ON "EstudioMember"("userId");

ALTER TABLE "EstudioMember" ADD CONSTRAINT "EstudioMember_estudioId_fkey"
  FOREIGN KEY ("estudioId") REFERENCES "EstudioJuridico"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "EstudioMember" ADD CONSTRAINT "EstudioMember_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PasantiaPostulacion ─────────────────────────────────
CREATE TABLE "PasantiaPostulacion" (
  "id" TEXT NOT NULL,
  "pasantiaId" TEXT NOT NULL,
  "postulanteId" TEXT NOT NULL,
  "cvUrl" TEXT,
  "cartaUrl" TEXT,
  "mensaje" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'ENVIADA',
  "fechaInicio" TIMESTAMP(3),
  "fechaCompletada" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PasantiaPostulacion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasantiaPostulacion_pasantiaId_postulanteId_key"
  ON "PasantiaPostulacion"("pasantiaId", "postulanteId");
CREATE INDEX "PasantiaPostulacion_postulanteId_idx"
  ON "PasantiaPostulacion"("postulanteId");
CREATE INDEX "PasantiaPostulacion_estado_idx"
  ON "PasantiaPostulacion"("estado");

ALTER TABLE "PasantiaPostulacion" ADD CONSTRAINT "PasantiaPostulacion_pasantiaId_fkey"
  FOREIGN KEY ("pasantiaId") REFERENCES "Pasantia"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasantiaPostulacion" ADD CONSTRAINT "PasantiaPostulacion_postulanteId_fkey"
  FOREIGN KEY ("postulanteId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ── PasantiaReview ──────────────────────────────────────
CREATE TABLE "PasantiaReview" (
  "id" TEXT NOT NULL,
  "postulacionId" TEXT NOT NULL,
  "authorId" TEXT NOT NULL,
  "authorDisplay" TEXT NOT NULL,
  "isAnonymous" BOOLEAN NOT NULL DEFAULT false,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "estudioResponse" TEXT,
  "estudioRespondedAt" TIMESTAMP(3),
  "reported" BOOLEAN NOT NULL DEFAULT false,
  "reportedAt" TIMESTAMP(3),
  "reportReason" TEXT,
  "moderated" BOOLEAN NOT NULL DEFAULT false,
  "moderatedAt" TIMESTAMP(3),
  "hiddenByAdmin" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "PasantiaReview_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasantiaReview_postulacionId_key"
  ON "PasantiaReview"("postulacionId");
CREATE INDEX "PasantiaReview_authorId_idx" ON "PasantiaReview"("authorId");
CREATE INDEX "PasantiaReview_rating_idx" ON "PasantiaReview"("rating");

ALTER TABLE "PasantiaReview" ADD CONSTRAINT "PasantiaReview_postulacionId_fkey"
  FOREIGN KEY ("postulacionId") REFERENCES "PasantiaPostulacion"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PasantiaReview" ADD CONSTRAINT "PasantiaReview_authorId_fkey"
  FOREIGN KEY ("authorId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
