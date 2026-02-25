-- =============================================
-- ContentReport Migration
-- =============================================

CREATE TABLE "ContentReport" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "contentType" TEXT NOT NULL,
  "contentId" TEXT NOT NULL,
  "reason" TEXT NOT NULL,
  "description" TEXT,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContentReport_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ContentReport"
  ADD CONSTRAINT "ContentReport_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
