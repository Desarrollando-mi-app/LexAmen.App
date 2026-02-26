-- CreateTable
CREATE TABLE "CurriculumProgress" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "submateria" TEXT NOT NULL,
    "completions" INT NOT NULL DEFAULT 0,
    "lastCompletedAt" TIMESTAMP(3),

    CONSTRAINT "CurriculumProgress_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CurriculumProgress_userId_submateria_key"
    ON "CurriculumProgress"("userId", "submateria");

-- AddForeignKey
ALTER TABLE "CurriculumProgress"
    ADD CONSTRAINT "CurriculumProgress_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
