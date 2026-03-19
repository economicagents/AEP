/**
 * Fetch and parse ERC-8004 agent registration files from agentURI.
 */

import type { AgentRegistrationFile } from "./types.js";

const DEFAULT_IPFS_GATEWAY = "https://ipfs.io/ipfs/";

function resolveUri(uri: string, ipfsGateway: string): string {
  if (uri.startsWith("ipfs://")) {
    const cid = uri.slice(7).replace(/^\/+/, "");
    return `${ipfsGateway.replace(/\/$/, "")}/${cid}`;
  }
  if (uri.startsWith("https://") || uri.startsWith("http://")) {
    return uri;
  }
  if (uri.startsWith("data:")) {
    return uri;
  }
  return uri;
}

/**
 * Fetch agent registration file from URI (IPFS, HTTPS, or data).
 */
export async function fetchRegistrationFile(
  uri: string,
  ipfsGateway = DEFAULT_IPFS_GATEWAY
): Promise<AgentRegistrationFile | null> {
  if (!uri || uri.trim() === "") {
    return null;
  }

  const resolved = resolveUri(uri, ipfsGateway);

  try {
    if (resolved.startsWith("data:")) {
      const match = resolved.match(/^data:application\/json;base64,(.+)$/);
      if (match) {
        const json = atob(match[1]);
        return JSON.parse(json) as AgentRegistrationFile;
      }
      const jsonMatch = resolved.match(/^data:application\/json,(.+)$/);
      if (jsonMatch) {
        return JSON.parse(decodeURIComponent(jsonMatch[1])) as AgentRegistrationFile;
      }
      return null;
    }

    const res = await fetch(resolved, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return null;
    }

    const json = (await res.json()) as AgentRegistrationFile;
    return json;
  } catch {
    return null;
  }
}
