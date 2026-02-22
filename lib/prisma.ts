import { PrismaClient } from "@/app/generated/prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Prisma v7 requiere `adapter` o `accelerateUrl` en las opciones.
// La URL real se configura en prisma.config.ts via DATABASE_URL.
// Usamos accelerateUrl como placeholder; en producción se reemplaza
// con el adapter de Supabase o la URL de Prisma Accelerate.
export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    accelerateUrl: process.env.DATABASE_URL ?? "prisma+postgres://placeholder",
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
