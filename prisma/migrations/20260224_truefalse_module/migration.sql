-- =============================================
-- TrueFalse Module Migration
-- =============================================

-- 1. Crear tabla TrueFalse
CREATE TABLE "TrueFalse" (
  "id" TEXT NOT NULL,
  "statement" TEXT NOT NULL,
  "isTrue" BOOLEAN NOT NULL,
  "explanation" TEXT,
  "unidad" TEXT NOT NULL DEFAULT 'DERECHO_CIVIL_1',
  "materia" TEXT NOT NULL,
  "submateria" TEXT NOT NULL,
  "tipo" TEXT NOT NULL,
  "nivel" TEXT NOT NULL DEFAULT 'BASICO',
  CONSTRAINT "TrueFalse_pkey" PRIMARY KEY ("id")
);

-- 2. Crear tabla UserTrueFalseAttempt
CREATE TABLE "UserTrueFalseAttempt" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "trueFalseId" TEXT NOT NULL,
  "selectedAnswer" BOOLEAN NOT NULL,
  "isCorrect" BOOLEAN NOT NULL,
  "attemptedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "UserTrueFalseAttempt_pkey" PRIMARY KEY ("id")
);

-- 3. Foreign keys
ALTER TABLE "UserTrueFalseAttempt"
  ADD CONSTRAINT "UserTrueFalseAttempt_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "UserTrueFalseAttempt"
  ADD CONSTRAINT "UserTrueFalseAttempt_trueFalseId_fkey"
  FOREIGN KEY ("trueFalseId") REFERENCES "TrueFalse"("id") ON DELETE CASCADE ON UPDATE CASCADE;
