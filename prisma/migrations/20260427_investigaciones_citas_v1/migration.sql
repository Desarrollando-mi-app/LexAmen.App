-- ═══════════════════════════════════════════════════════════════
-- INVESTIGACIONES (Imprenta · III) — Sprint 1
-- Schema base: 5 modelos + extensión User para métricas reputacionales.
-- ═══════════════════════════════════════════════════════════════

-- ─── 1. User: campos de métricas reputacionales ──────────────────
ALTER TABLE "User"
  ADD COLUMN "totalCitationsReceived" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hIndex"                 INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "hIndexUpdatedAt"        TIMESTAMP(3);

-- ─── 2. investigaciones ──────────────────────────────────────────
CREATE TABLE "investigaciones" (
  "id"                       TEXT NOT NULL,
  "userId"                   TEXT NOT NULL,

  "titulo"                   TEXT NOT NULL,
  "deck"                     TEXT,
  "abstract"                 TEXT NOT NULL,
  "contenido"                TEXT NOT NULL,
  "bibliografiaExterna"      JSONB,

  "tipo"                     TEXT NOT NULL,
  "area"                     TEXT NOT NULL,
  "areasSecundarias"         TEXT[] NOT NULL DEFAULT '{}',

  "wordCount"                INTEGER NOT NULL DEFAULT 0,
  "abstractWordCount"        INTEGER NOT NULL DEFAULT 0,

  "isFeatured"               BOOLEAN NOT NULL DEFAULT false,
  "featuredAt"               TIMESTAMP(3),
  "featuredQuoteCitationId"  TEXT,

  "citationsInternal"        INTEGER NOT NULL DEFAULT 0,
  "citationsExternal"        INTEGER NOT NULL DEFAULT 0,
  "selfCitations"            INTEGER NOT NULL DEFAULT 0,
  "views"                    INTEGER NOT NULL DEFAULT 0,

  "status"                   TEXT NOT NULL DEFAULT 'published',
  "publishedAt"              TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"                TIMESTAMP(3) NOT NULL,
  "createdAt"                TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "investigaciones_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "investigaciones_featuredQuoteCitationId_key"
  ON "investigaciones"("featuredQuoteCitationId");
CREATE INDEX "investigaciones_tipo_idx"               ON "investigaciones"("tipo");
CREATE INDEX "investigaciones_area_idx"               ON "investigaciones"("area");
CREATE INDEX "investigaciones_userId_idx"             ON "investigaciones"("userId");
CREATE INDEX "investigaciones_publishedAt_idx"        ON "investigaciones"("publishedAt");
CREATE INDEX "investigaciones_citationsInternal_idx"  ON "investigaciones"("citationsInternal");

ALTER TABLE "investigaciones"
  ADD CONSTRAINT "investigaciones_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 3. investigacion_instituciones (M:N con InstitucionJuridica) ──
CREATE TABLE "investigacion_instituciones" (
  "investigacionId" TEXT NOT NULL,
  "institucionId"   INTEGER NOT NULL,

  CONSTRAINT "investigacion_instituciones_pkey"
    PRIMARY KEY ("investigacionId", "institucionId")
);

CREATE INDEX "investigacion_instituciones_institucionId_idx"
  ON "investigacion_instituciones"("institucionId");

ALTER TABLE "investigacion_instituciones"
  ADD CONSTRAINT "investigacion_instituciones_investigacionId_fkey"
  FOREIGN KEY ("investigacionId") REFERENCES "investigaciones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "investigacion_instituciones"
  ADD CONSTRAINT "investigacion_instituciones_institucionId_fkey"
  FOREIGN KEY ("institucionId") REFERENCES "InstitucionJuridica"("id")
  ON DELETE RESTRICT ON UPDATE CASCADE;

-- ─── 4. citaciones (Investigación → Investigación) ──────────────
CREATE TABLE "citaciones" (
  "id"             TEXT NOT NULL,
  "citingInvId"    TEXT NOT NULL,
  "citedInvId"     TEXT NOT NULL,
  "citingAuthorId" TEXT NOT NULL,
  "citedAuthorId"  TEXT NOT NULL,
  "contextSnippet" TEXT,
  "locationInText" TEXT,
  "isSelfCitation" BOOLEAN NOT NULL DEFAULT false,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "citaciones_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "citaciones_citedInvId_idx"     ON "citaciones"("citedInvId");
CREATE INDEX "citaciones_citingInvId_idx"    ON "citaciones"("citingInvId");
CREATE INDEX "citaciones_citedAuthorId_idx"  ON "citaciones"("citedAuthorId");

ALTER TABLE "citaciones"
  ADD CONSTRAINT "citaciones_citingInvId_fkey"
  FOREIGN KEY ("citingInvId") REFERENCES "investigaciones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "citaciones"
  ADD CONSTRAINT "citaciones_citedInvId_fkey"
  FOREIGN KEY ("citedInvId") REFERENCES "investigaciones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- FK del featured quote (después de crear citaciones):
ALTER TABLE "investigaciones"
  ADD CONSTRAINT "investigaciones_featuredQuoteCitationId_fkey"
  FOREIGN KEY ("featuredQuoteCitationId") REFERENCES "citaciones"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- ─── 5. citaciones_externas ─────────────────────────────────────
CREATE TABLE "citaciones_externas" (
  "id"              TEXT NOT NULL,
  "investigacionId" TEXT NOT NULL,
  "declaredById"    TEXT NOT NULL,
  "citingTitle"     TEXT NOT NULL,
  "citingAuthor"    TEXT NOT NULL,
  "citingYear"      INTEGER,
  "citingSource"    TEXT,
  "citingUrl"       TEXT,
  "citingPdfUrl"    TEXT,
  "status"          TEXT NOT NULL DEFAULT 'pendiente',
  "reviewedById"    TEXT,
  "reviewedAt"      TIMESTAMP(3),
  "reviewNotes"     TEXT,
  "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "citaciones_externas_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "citaciones_externas_investigacionId_idx"
  ON "citaciones_externas"("investigacionId");
CREATE INDEX "citaciones_externas_status_idx"
  ON "citaciones_externas"("status");

ALTER TABLE "citaciones_externas"
  ADD CONSTRAINT "citaciones_externas_investigacionId_fkey"
  FOREIGN KEY ("investigacionId") REFERENCES "investigaciones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

-- ─── 6. citacion_reportes ───────────────────────────────────────
CREATE TABLE "citacion_reportes" (
  "id"           TEXT NOT NULL,
  "citacionId"   TEXT NOT NULL,
  "reportedById" TEXT NOT NULL,
  "reason"       TEXT NOT NULL,
  "details"      TEXT,
  "status"       TEXT NOT NULL DEFAULT 'abierto',
  "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "citacion_reportes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "citacion_reportes_citacionId_idx" ON "citacion_reportes"("citacionId");
CREATE INDEX "citacion_reportes_status_idx"     ON "citacion_reportes"("status");

ALTER TABLE "citacion_reportes"
  ADD CONSTRAINT "citacion_reportes_citacionId_fkey"
  FOREIGN KEY ("citacionId") REFERENCES "citaciones"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
