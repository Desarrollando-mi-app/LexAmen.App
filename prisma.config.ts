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
  },
  datasource: {
    url: process.env["DATABASE_URL"],
  },
});
