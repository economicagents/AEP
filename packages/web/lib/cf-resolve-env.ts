import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Read env from `process.env` (Node) or Worker `env` (OpenNext on Cloudflare). */
export function envStringFromProcess(key: string): string | undefined {
  const v = process.env[key]?.trim();
  return v || undefined;
}

export async function resolveEnvString(key: string): Promise<string | undefined> {
  const fromProcess = envStringFromProcess(key);
  if (fromProcess) return fromProcess;
  try {
    const { env } = await getCloudflareContext({ async: true });
    const v = env[key as keyof typeof env];
    if (typeof v === "string" && v.trim()) return v.trim();
  } catch {
    // Not running on Cloudflare Worker (e.g. Node `next start`)
  }
  return undefined;
}
