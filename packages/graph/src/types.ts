import type { Address } from "viem";

export interface GraphConfig {
  rpcUrl: string;
  chainId: number;
  graphPath: string;
  aepAccountFactoryAddress: Address;
  entryPointAddress: Address;
  creditFacilityFactoryAddress?: Address;
  escrowFactoryAddress?: Address;
  revenueSplitterFactoryAddress?: Address;
  slaFactoryAddress?: Address;
  usdcAddress: Address;
}

export interface SyncResult {
  accountsAdded: number;
  paymentsAdded: number;
  userOpsAdded: number;
  creditEventsAdded: number;
  escrowEventsAdded: number;
  splitterEventsAdded: number;
  slaEventsAdded: number;
}

export type PaymentSource =
  | "transfer"
  | "credit_draw"
  | "credit_repay"
  | "escrow_fund"
  | "escrow_release"
  | "splitter_distribute";
