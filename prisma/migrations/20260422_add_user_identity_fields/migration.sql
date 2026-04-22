-- Add identity fields to User for accountability at registration time.
-- Fields: rut (unique, Chilean national ID), phone, dateOfBirth.

ALTER TABLE "User" ADD COLUMN "rut" TEXT;
ALTER TABLE "User" ADD COLUMN "phone" TEXT;
ALTER TABLE "User" ADD COLUMN "dateOfBirth" TIMESTAMP(3);

CREATE UNIQUE INDEX "User_rut_key" ON "User"("rut");
