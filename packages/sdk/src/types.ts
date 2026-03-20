import type { Address, Chain, PublicClient, WalletClient } from "viem";

export interface AEPConfig {
  rpcUrl: string;
  bundlerRpcUrl?: string;
  chain: Chain;
  factoryAddress: Address;
  entryPointAddress: Address;
  /** AEP Treasury address for relationship fees. Env: AEP_TREASURY_ADDRESS */
  treasuryAddress?: Address;
}

export interface CreateAccountOptions {
  owner: Address;
  salt?: `0x${string}`;
  rpcUrl: string;
  bundlerRpcUrl?: string;
  chain: Chain;
  factoryAddress: Address;
  entryPointAddress: Address;
}

export interface PolicyConfig {
  maxPerTx?: bigint;
  maxDaily?: bigint;
  maxWeekly?: bigint;
}

/** Single call for execute or executeBatch */
export interface ExecuteCall {
  to: Address;
  value?: bigint;
  data?: `0x${string}`;
}

export interface BuildUserOpOptions {
  account: Address;
  calls: ExecuteCall[];
  rpcUrl: string;
  entryPointAddress: Address;
  chainId: number;
  nonce?: bigint;
  callGasLimit?: bigint;
  verificationGasLimit?: bigint;
  preVerificationGas?: bigint;
  maxFeePerGas?: bigint;
  maxPriorityFeePerGas?: bigint;
}
