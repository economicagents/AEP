/**
 * JSON-based index store for MVP. Persists providers and sync state.
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { dirname, join } from "path";
import type { IndexedProvider, IndexState } from "./types.js";

const PROVIDERS_FILE = "providers.json";
const STATE_FILE = "state.json";

export function ensureIndexDir(indexPath: string): void {
  mkdirSync(indexPath, { recursive: true });
}

export function loadProviders(indexPath: string): IndexedProvider[] {
  const file = join(indexPath, PROVIDERS_FILE);
  if (!existsSync(file)) return [];
  try {
    const data = readFileSync(file, "utf-8");
    const parsed = JSON.parse(data) as Array<Record<string, unknown>>;
    return parsed.map((p) => ({
      ...p,
      agentId: BigInt(p.agentId as string),
      reputationCount: p.reputationCount != null ? BigInt(p.reputationCount as string) : undefined,
      lastProbePrice: p.lastProbePrice != null ? BigInt(p.lastProbePrice as string) : undefined,
    })) as IndexedProvider[];
  } catch {
    return [];
  }
}

export function saveProviders(indexPath: string, providers: IndexedProvider[]): void {
  ensureIndexDir(indexPath);
  const file = join(indexPath, PROVIDERS_FILE);
  const serializable = providers.map((p) => ({
    ...p,
    agentId: p.agentId.toString(),
    reputationCount: p.reputationCount?.toString(),
    lastProbePrice: p.lastProbePrice?.toString(),
  }));
  writeFileSync(file, JSON.stringify(serializable, null, 2));
}

export function loadState(indexPath: string): IndexState | null {
  const file = join(indexPath, STATE_FILE);
  if (!existsSync(file)) return null;
  try {
    const data = readFileSync(file, "utf-8");
    return JSON.parse(data) as IndexState;
  } catch {
    return null;
  }
}

export function saveState(indexPath: string, state: IndexState): void {
  ensureIndexDir(indexPath);
  const file = join(indexPath, STATE_FILE);
  writeFileSync(file, JSON.stringify(state, null, 2));
}
