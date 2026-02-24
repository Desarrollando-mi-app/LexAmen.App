-- AlterTable: Add nivel field to Flashcard
ALTER TABLE "Flashcard" ADD COLUMN "nivel" TEXT NOT NULL DEFAULT 'BASICO';
