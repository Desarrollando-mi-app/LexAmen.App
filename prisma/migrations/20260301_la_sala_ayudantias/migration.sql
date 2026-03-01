-- CreateEnum
CREATE TYPE "AyudantiaType" AS ENUM ('OFREZCO', 'BUSCO');

-- CreateEnum
CREATE TYPE "AyudantiaFormat" AS ENUM ('ONLINE', 'PRESENCIAL', 'AMBOS');

-- CreateEnum
CREATE TYPE "PriceType" AS ENUM ('GRATUITO', 'PAGADO');

-- CreateEnum
CREATE TYPE "ContactMethod" AS ENUM ('WHATSAPP', 'EMAIL', 'OTRO');

-- CreateTable
CREATE TABLE "Ayudantia" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" "AyudantiaType" NOT NULL,
    "materia" TEXT NOT NULL,
    "format" "AyudantiaFormat" NOT NULL,
    "priceType" "PriceType" NOT NULL,
    "priceAmount" INTEGER,
    "description" TEXT NOT NULL,
    "universidad" TEXT NOT NULL,
    "orientadaA" TEXT[],
    "contactMethod" "ContactMethod" NOT NULL,
    "contactValue" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "reportCount" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "Ayudantia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AyudantiaReport" (
    "id" TEXT NOT NULL,
    "ayudantiaId" TEXT NOT NULL,
    "reportedById" TEXT NOT NULL,
    "reason" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AyudantiaReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AyudantiaStreak" (
    "userId" TEXT NOT NULL,
    "monthsActive" INTEGER NOT NULL DEFAULT 0,
    "lastActiveMonth" TEXT NOT NULL,
    "longestStreak" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "AyudantiaStreak_pkey" PRIMARY KEY ("userId")
);

-- CreateIndex
CREATE INDEX "Ayudantia_type_isActive_idx" ON "Ayudantia"("type", "isActive");

-- CreateIndex
CREATE INDEX "Ayudantia_userId_idx" ON "Ayudantia"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "AyudantiaReport_ayudantiaId_reportedById_key" ON "AyudantiaReport"("ayudantiaId", "reportedById");

-- AddForeignKey
ALTER TABLE "Ayudantia" ADD CONSTRAINT "Ayudantia_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AyudantiaReport" ADD CONSTRAINT "AyudantiaReport_ayudantiaId_fkey" FOREIGN KEY ("ayudantiaId") REFERENCES "Ayudantia"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AyudantiaReport" ADD CONSTRAINT "AyudantiaReport_reportedById_fkey" FOREIGN KEY ("reportedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AyudantiaStreak" ADD CONSTRAINT "AyudantiaStreak_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
