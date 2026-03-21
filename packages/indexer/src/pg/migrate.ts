import { readFileSync, readdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import type { Pool, PoolClient } from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));

function migrationsDir(): string {
  return join(__dirname, "..", "..", "migrations");
}

const BOOTSTRAP_SQL = `
CREATE TABLE IF NOT EXISTS schema_migrations (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL UNIQUE,
  applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
`;

export async function runMigrations(client: PoolClient): Promise<void> {
  await client.query(BOOTSTRAP_SQL);

  const dir = migrationsDir();
  const files = readdirSync(dir)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  for (const name of files) {
    const applied = await client.query<{ n: string }>(
      "SELECT 1 AS n FROM schema_migrations WHERE name = $1",
      [name]
    );
    if (applied.rows.length > 0) {
      continue;
    }

    const sql = readFileSync(join(dir, name), "utf-8");
    await client.query("BEGIN");
    try {
      await client.query(sql);
      await client.query("INSERT INTO schema_migrations (name) VALUES ($1)", [name]);
      await client.query("COMMIT");
    } catch (e) {
      await client.query("ROLLBACK");
      throw e;
    }
  }
}

export async function ensureMigrated(pool: Pool): Promise<void> {
  const c = await pool.connect();
  try {
    await runMigrations(c);
  } finally {
    c.release();
  }
}
