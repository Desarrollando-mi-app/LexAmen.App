-- Peer Review — postulación con admin.
--
-- Antes de poder ser asignado como reviewer, el usuario presenta una
-- postulación formal que el admin aprueba o rechaza. Si se aprueba,
-- `User.isPeerReviewer` queda en `true` y el usuario entra al pool
-- de auto-asignación (gateado en `/api/diario/peer-review/solicitar`).

-- ─── User: nuevos campos ───
ALTER TABLE "User" ADD COLUMN "isPeerReviewer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "User" ADD COLUMN "peerReviewerSince" TIMESTAMP(3);

-- ─── PeerReviewPostulacion ───
CREATE TABLE "PeerReviewPostulacion" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "motivacion" TEXT NOT NULL,
  "areasInteres" TEXT,
  "publicacionMuestra" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'pendiente',
  "resueltoPorId" TEXT,
  "resueltaAt" TIMESTAMP(3),
  "resolucionNota" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "PeerReviewPostulacion_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "PeerReviewPostulacion_estado_createdAt_idx"
  ON "PeerReviewPostulacion"("estado", "createdAt");

CREATE INDEX "PeerReviewPostulacion_userId_createdAt_idx"
  ON "PeerReviewPostulacion"("userId", "createdAt");

ALTER TABLE "PeerReviewPostulacion"
  ADD CONSTRAINT "PeerReviewPostulacion_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PeerReviewPostulacion"
  ADD CONSTRAINT "PeerReviewPostulacion_resueltoPorId_fkey"
  FOREIGN KEY ("resueltoPorId") REFERENCES "User"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;
