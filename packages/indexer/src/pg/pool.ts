import { Pool } from "pg";
import { getIndexDatabaseUrl } from "../pg-config.js";

export { getIndexDatabaseUrl } from "../pg-config.js";

let pool: Pool | null = null;

export function getPgPool(): Pool {
  const url = getIndexDatabaseUrl();
  if (!url) {
    throw new Error("Set AEP_INDEX_DATABASE_URL or indexDatabaseUrl in ~/.aep/config.json");
  }
  if (!pool) {
    pool = new Pool({ connectionString: url, max: 10 });
  }
  return pool;
}

export async function closePgPool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
