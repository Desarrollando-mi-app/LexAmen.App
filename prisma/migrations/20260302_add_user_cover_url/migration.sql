-- AlterTable: Add cover (banner) image URL to User
-- Mirrors avatarUrl pattern. Nullable — existing rows default to NULL and
-- fall back to the procedural cover in the UI.
ALTER TABLE "User" ADD COLUMN "coverUrl" TEXT;
