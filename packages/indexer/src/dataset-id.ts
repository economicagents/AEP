import { createHash } from "crypto";
import { realpathSync } from "fs";

/**
 * Stable namespace for Postgres rows tied to an index directory.
 * Override with AEP_INDEX_DATASET_ID for tests or multi-tenant hosts.
 */
export function getSearchDatasetId(indexPath: string): string {
  const override = process.env.AEP_INDEX_DATASET_ID;
  if (override && override.length > 0) {
    return override;
  }
  try {
    const resolved = realpathSync(indexPath);
    return createHash("sha256").update(resolved).digest("hex").slice(0, 32);
  } catch {
    return createHash("sha256").update(indexPath).digest("hex").slice(0, 32);
  }
}
