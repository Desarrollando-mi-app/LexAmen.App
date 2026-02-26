-- CreateEnum LeagueTier
CREATE TYPE "LeagueTier" AS ENUM ('CARTON', 'HIERRO', 'BRONCE', 'COBRE', 'PLATA', 'ORO', 'DIAMANTE', 'PLATINO', 'JURISCONSULTO');

-- CreateEnum CausaStatus
CREATE TYPE "CausaStatus" AS ENUM ('PENDING', 'ACTIVE', 'COMPLETED', 'REJECTED', 'EXPIRED');

-- AlterTable User
ALTER TABLE "User" ADD COLUMN "causasGanadas" INT NOT NULL DEFAULT 0;
ALTER TABLE "User" ADD COLUMN "causasPerdidas" INT NOT NULL DEFAULT 0;

-- CreateTable League
CREATE TABLE "League" (
    "id" TEXT NOT NULL,
    "tier" "LeagueTier" NOT NULL,
    "weekStart" TIMESTAMP(3) NOT NULL,
    "weekEnd" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "League_pkey" PRIMARY KEY ("id")
);

-- CreateIndex League
CREATE INDEX "League_tier_weekStart_idx" ON "League"("tier", "weekStart");

-- CreateTable LeagueMember
CREATE TABLE "LeagueMember" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "weeklyXp" INT NOT NULL DEFAULT 0,
    "rank" INT,
    CONSTRAINT "LeagueMember_pkey" PRIMARY KEY ("id")
);

-- CreateIndex LeagueMember
CREATE UNIQUE INDEX "LeagueMember_userId_leagueId_key" ON "LeagueMember"("userId", "leagueId");
CREATE INDEX "LeagueMember_leagueId_weeklyXp_idx" ON "LeagueMember"("leagueId", "weeklyXp");

-- AddForeignKey LeagueMember
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "LeagueMember" ADD CONSTRAINT "LeagueMember_leagueId_fkey" FOREIGN KEY ("leagueId") REFERENCES "League"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable Causa
CREATE TABLE "Causa" (
    "id" TEXT NOT NULL,
    "challengerId" TEXT NOT NULL,
    "challengedId" TEXT NOT NULL,
    "status" "CausaStatus" NOT NULL DEFAULT 'PENDING',
    "winnerId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    CONSTRAINT "Causa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex Causa
CREATE INDEX "Causa_challengerId_status_idx" ON "Causa"("challengerId", "status");
CREATE INDEX "Causa_challengedId_status_idx" ON "Causa"("challengedId", "status");

-- AddForeignKey Causa
ALTER TABLE "Causa" ADD CONSTRAINT "Causa_challengerId_fkey" FOREIGN KEY ("challengerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Causa" ADD CONSTRAINT "Causa_challengedId_fkey" FOREIGN KEY ("challengedId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Causa" ADD CONSTRAINT "Causa_winnerId_fkey" FOREIGN KEY ("winnerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- CreateTable CausaAnswer
CREATE TABLE "CausaAnswer" (
    "id" TEXT NOT NULL,
    "causaId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "mcqId" TEXT NOT NULL,
    "questionIdx" INT NOT NULL,
    "selectedOption" TEXT,
    "isCorrect" BOOLEAN,
    "timeMs" INT,
    "score" INT NOT NULL DEFAULT 0,
    "answeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CausaAnswer_pkey" PRIMARY KEY ("id")
);

-- CreateIndex CausaAnswer
CREATE UNIQUE INDEX "CausaAnswer_causaId_userId_questionIdx_key" ON "CausaAnswer"("causaId", "userId", "questionIdx");

-- AddForeignKey CausaAnswer
ALTER TABLE "CausaAnswer" ADD CONSTRAINT "CausaAnswer_causaId_fkey" FOREIGN KEY ("causaId") REFERENCES "Causa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CausaAnswer" ADD CONSTRAINT "CausaAnswer_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CausaAnswer" ADD CONSTRAINT "CausaAnswer_mcqId_fkey" FOREIGN KEY ("mcqId") REFERENCES "MCQ"("id") ON DELETE CASCADE ON UPDATE CASCADE;
