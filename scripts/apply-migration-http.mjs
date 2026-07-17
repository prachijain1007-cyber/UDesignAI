// One-off helper: applies a Prisma migration.sql file to Neon over its HTTPS
// SQL endpoint, for environments that can't make raw TCP connections to
// Postgres. Also records the migration in `_prisma_migrations` so a normal
// `prisma migrate deploy` run later (from a machine with real TCP access)
// recognizes it as already applied instead of re-running it.
//
// Usage: node scripts/apply-migration-http.mjs prisma/migrations/<name>/migration.sql
import { readFileSync } from "fs";
import { createHash, randomUUID } from "crypto";
import path from "path";
import { PrismaClient } from "@prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";

const migrationPath = process.argv[2];
if (!migrationPath) {
  console.error("Usage: node scripts/apply-migration-http.mjs <path-to-migration.sql>");
  process.exit(1);
}

const migrationName = path.basename(path.dirname(migrationPath));
const sql = readFileSync(migrationPath, "utf8");
const checksum = createHash("sha256").update(sql).digest("hex");

neonConfig.poolQueryViaFetch = true;
const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

function splitStatements(script) {
  return script
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split("\n")
        .filter((line) => !line.trim().startsWith("--"))
        .join("\n")
        .trim()
    )
    .filter((s) => s.length > 0);
}

async function main() {
  await prisma.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "_prisma_migrations" (
      "id" VARCHAR(36) NOT NULL,
      "checksum" VARCHAR(64) NOT NULL,
      "finished_at" TIMESTAMPTZ,
      "migration_name" VARCHAR(255) NOT NULL,
      "logs" TEXT,
      "rolled_back_at" TIMESTAMPTZ,
      "started_at" TIMESTAMPTZ NOT NULL DEFAULT now(),
      "applied_steps_count" INTEGER NOT NULL DEFAULT 0,
      CONSTRAINT "_prisma_migrations_pkey" PRIMARY KEY ("id")
    );
  `);

  const already = await prisma.$queryRawUnsafe(
    `SELECT 1 FROM "_prisma_migrations" WHERE migration_name = $1 AND finished_at IS NOT NULL;`,
    migrationName
  );
  if (already.length > 0) {
    console.log(`Migration ${migrationName} already applied, skipping.`);
    return;
  }

  const statements = splitStatements(sql);
  if (statements.length === 0) {
    throw new Error(`Parsed 0 statements out of ${migrationPath} — refusing to record a false success.`);
  }
  console.log(`Applying ${statements.length} statements from ${migrationName}...`);

  for (const [i, statement] of statements.entries()) {
    await prisma.$executeRawUnsafe(statement);
    console.log(`  [${i + 1}/${statements.length}] ok`);
  }

  const id = randomUUID();
  await prisma.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" (id, checksum, migration_name, started_at, finished_at, applied_steps_count)
     VALUES ($1, $2, $3, now(), now(), $4);`,
    id,
    checksum,
    migrationName,
    statements.length
  );

  console.log(`Migration ${migrationName} applied and recorded.`);
}

main()
  .catch((err) => {
    console.error("FAILED:", err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
