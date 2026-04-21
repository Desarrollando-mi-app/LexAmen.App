import dotenv from "dotenv";
import { defineConfig } from "prisma/config";

// Carga .env.local primero (donde está el DATABASE_URL real),
// con fallback a .env
dotenv.config({ path: ".env.local" });
dotenv.config({ path: ".env" });

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "npx tsx prisma/seed.ts",
  },
  datasource: {
    // Operaciones CLI (migrate, db push, introspect) usan el session pooler
    // (puerto 5432) porque el transaction pooler (6543 + pgbouncer) rompe
    // los prepared statements que necesita migrate.
    // Runtime PrismaClient sigue leyendo DATABASE_URL del env directamente.
    url: process.env["DIRECT_URL"] ?? process.env["DATABASE_URL"],
  },
});
