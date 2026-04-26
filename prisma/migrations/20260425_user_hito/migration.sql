-- UserHito — hitos personalizados de trayectoria
--
-- Permite que el usuario registre hitos arbitrarios (práctica profesional,
-- magíster, premios, ascensos, certificaciones, etc.) más allá de los 4
-- campos fijos del modelo User (anioIngreso, anioEgreso, anioJura,
-- empleoActual). Los UserHito se mezclan con los hitos auto-derivados
-- en el timeline de Trayectoria del perfil.

CREATE TABLE "UserHito" (
  "id"          TEXT NOT NULL,
  "userId"      TEXT NOT NULL,

  "tipo"        TEXT NOT NULL,
  "titulo"      TEXT NOT NULL,
  "descripcion" TEXT,
  "institucion" TEXT,
  "fecha"       TIMESTAMP(3) NOT NULL,
  "esActual"    BOOLEAN NOT NULL DEFAULT false,

  "createdAt"   TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"   TIMESTAMP(3) NOT NULL,

  CONSTRAINT "UserHito_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UserHito"
  ADD CONSTRAINT "UserHito_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX "UserHito_userId_fecha_idx" ON "UserHito"("userId", "fecha" DESC);
