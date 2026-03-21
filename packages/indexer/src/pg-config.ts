import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";

let cachedUrl: string | undefined | null = null;

/**
 * Postgres URL for hybrid search: `AEP_INDEX_DATABASE_URL`, else optional `indexDatabaseUrl` in `~/.aep/config.json`.
 */
export function getIndexDatabaseUrl(): string | undefined {
  if (cachedUrl !== null) {
    return cachedUrl;
  }
  const env = process.env.AEP_INDEX_DATABASE_URL;
  if (env && env.length > 0) {
    cachedUrl = env;
    return env;
  }
  const configPath = process.env.AEP_CONFIG_PATH?.length
    ? process.env.AEP_CONFIG_PATH
    : join(homedir(), ".aep", "config.json");
  if (existsSync(configPath)) {
    try {
      const j = JSON.parse(readFileSync(configPath, "utf-8")) as { indexDatabaseUrl?: string };
      if (typeof j.indexDatabaseUrl === "string" && j.indexDatabaseUrl.length > 0) {
        cachedUrl = j.indexDatabaseUrl;
        return j.indexDatabaseUrl;
      }
    } catch {
      // ignore invalid config
    }
  }
  cachedUrl = undefined;
  return undefined;
}

/** For tests that switch env/config between cases. */
export function resetIndexDatabaseUrlCache(): void {
  cachedUrl = null;
}
