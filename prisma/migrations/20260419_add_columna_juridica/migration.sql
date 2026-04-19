-- CreateTable: ColumnaJuridica (editorial opinion columns — text-based,
-- heavier than Obiter Dictum, lighter than Ensayo)
CREATE TABLE "ColumnaJuridica" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "resumen" TEXT,
    "materia" TEXT,
    "tags" TEXT,
    "showInFeed" BOOLEAN NOT NULL DEFAULT true,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isHidden" BOOLEAN NOT NULL DEFAULT false,
    "apoyosCount" INTEGER NOT NULL DEFAULT 0,
    "citasCount" INTEGER NOT NULL DEFAULT 0,
    "guardadosCount" INTEGER NOT NULL DEFAULT 0,
    "viewsCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ColumnaJuridica_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ColumnaApoyo
CREATE TABLE "ColumnaApoyo" (
    "id" TEXT NOT NULL,
    "columnaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ColumnaApoyo_pkey" PRIMARY KEY ("id")
);

-- CreateTable: ColumnaGuardado
CREATE TABLE "ColumnaGuardado" (
    "id" TEXT NOT NULL,
    "columnaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ColumnaGuardado_pkey" PRIMARY KEY ("id")
);

-- Indexes ColumnaJuridica
CREATE INDEX "ColumnaJuridica_userId_idx" ON "ColumnaJuridica"("userId");
CREATE INDEX "ColumnaJuridica_materia_idx" ON "ColumnaJuridica"("materia");
CREATE INDEX "ColumnaJuridica_isActive_isHidden_createdAt_idx" ON "ColumnaJuridica"("isActive", "isHidden", "createdAt" DESC);

-- Indexes ColumnaApoyo
CREATE UNIQUE INDEX "ColumnaApoyo_columnaId_userId_key" ON "ColumnaApoyo"("columnaId", "userId");
CREATE INDEX "ColumnaApoyo_userId_idx" ON "ColumnaApoyo"("userId");

-- Indexes ColumnaGuardado
CREATE UNIQUE INDEX "ColumnaGuardado_columnaId_userId_key" ON "ColumnaGuardado"("columnaId", "userId");
CREATE INDEX "ColumnaGuardado_userId_idx" ON "ColumnaGuardado"("userId");

-- Foreign keys
ALTER TABLE "ColumnaJuridica" ADD CONSTRAINT "ColumnaJuridica_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ColumnaApoyo" ADD CONSTRAINT "ColumnaApoyo_columnaId_fkey" FOREIGN KEY ("columnaId") REFERENCES "ColumnaJuridica"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColumnaApoyo" ADD CONSTRAINT "ColumnaApoyo_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ColumnaGuardado" ADD CONSTRAINT "ColumnaGuardado_columnaId_fkey" FOREIGN KEY ("columnaId") REFERENCES "ColumnaJuridica"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "ColumnaGuardado" ADD CONSTRAINT "ColumnaGuardado_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
