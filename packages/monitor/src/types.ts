export interface MonitorConfig {
  rpcUrl: string;
  chainId: number;
  entryPointAddress: `0x${string}`;
  accounts: `0x${string}`[];
  facilities: `0x${string}`[];
  slas: `0x${string}`[];
  webhookUrl?: string;
  pollIntervalMs?: number;
  statePath?: string;
}

export type AlertSeverity = "high" | "medium";

export interface SecurityAlert {
  type: string;
  severity: AlertSeverity;
  contract?: string;
  blockNumber: number;
  txHash?: string;
  data: Record<string, unknown>;
  timestamp: number;
}
