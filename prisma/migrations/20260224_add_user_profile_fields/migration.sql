-- AlterTable: Add profile fields to User table
-- Step 1: Add columns as nullable first (safe for existing rows)
ALTER TABLE "User" ADD COLUMN "firstName" TEXT;
ALTER TABLE "User" ADD COLUMN "lastName" TEXT;
ALTER TABLE "User" ADD COLUMN "age" INTEGER;
ALTER TABLE "User" ADD COLUMN "gender" TEXT;
ALTER TABLE "User" ADD COLUMN "institution" TEXT;
ALTER TABLE "User" ADD COLUMN "universityYear" INTEGER;

-- Step 2: Populate firstName/lastName from existing name column
UPDATE "User" SET "firstName" = COALESCE(SPLIT_PART("name", ' ', 1), 'Sin'), "lastName" = COALESCE(NULLIF(SPLIT_PART("name", ' ', 2), ''), 'Nombre') WHERE "firstName" IS NULL;

-- Step 3: Make firstName and lastName required
ALTER TABLE "User" ALTER COLUMN "firstName" SET NOT NULL;
ALTER TABLE "User" ALTER COLUMN "lastName" SET NOT NULL;

-- Step 4: Drop the old name column
ALTER TABLE "User" DROP COLUMN "name";
