/**
 * Shared viem transport for JSON-RPC URLs (HTTPS or WSS).
 * Used by @economicagents/sdk, @economicagents/graph, indexer, monitor.
 */

import { http, webSocket, type Transport } from "viem";

/**
 * Returns an HTTP(S) or WebSocket(S) viem transport for the given RPC URL.
 */
export function transportFromRpcUrl(rpcUrl: string): Transport {
  const trimmed = rpcUrl.trim();
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("wss://") || lower.startsWith("ws://")) {
    return webSocket(trimmed);
  }
  return http(trimmed);
}
