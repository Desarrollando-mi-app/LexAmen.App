/**
 * Migration script: Copies institution → universidad for all users
 * who have institution set but universidad is null.
 *
 * Run with: npx dotenvx run --env-file=.env.local -- npx tsx scripts/migrate-institution-to-universidad.ts
 */

import pg from "pg";

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.error("DATABASE_URL not set. Make sure to run with dotenvx.");
    process.exit(1);
  }

  const pool = new pg.Pool({ connectionString });

  console.log("Starting migration: institution → universidad...\n");

  // Count users to migrate
  const countResult = await pool.query(
    `SELECT COUNT(*) as total FROM "User" WHERE institution IS NOT NULL AND universidad IS NULL`
  );
  const total = parseInt(countResult.rows[0].total, 10);
  console.log(`Found ${total} users to migrate.\n`);

  if (total === 0) {
    console.log("Nothing to migrate!");
    await pool.end();
    return;
  }

  // Migrate: copy institution → universidad
  const result = await pool.query(
    `UPDATE "User" SET universidad = institution WHERE institution IS NOT NULL AND universidad IS NULL`
  );

  console.log(`Migration complete! Updated ${result.rowCount} users.`);

  await pool.end();
}

main().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
