import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  keccak256,
  toHex,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { SLA_CONTRACT_ABI, SLA_CONTRACT_FACTORY_ABI, ERC20_APPROVE_ABI } from "../abi.js";
import { baseSepolia } from "../account.js";

export interface SLAState {
  staked: boolean;
  breached: boolean;
  balance: bigint;
}

export interface CreateSLAConfig {
  provider: Address;
  consumer: Address;
  providerAgentId: bigint;
  stakeToken: Address;
  stakeAmount: bigint;
  validationRegistry: Address;
  breachThreshold: number;
  factoryAddress: Address;
  rpcUrl: string;
  privateKey: `0x${string}`;
  /** Setup fee in stakeToken (6 decimals). Caller pays. Default 0. */
  setupFee?: bigint;
  /** Chain for contract calls. Default baseSepolia. */
  chain?: Chain;
}

export async function createSLA(config: CreateSLAConfig): Promise<{ sla: Address; txHash: Hash }> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: http(config.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: http(config.rpcUrl),
  });

  const setupFee = config.setupFee ?? 0n;
  if (setupFee > 0n) {
    await client!.writeContract({
      address: config.stakeToken,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [config.factoryAddress, setupFee],
    });
  }

  const hash = await client!.writeContract({
    address: config.factoryAddress,
    abi: SLA_CONTRACT_FACTORY_ABI,
    functionName: "createSLA",
    args: [
      config.provider,
      config.consumer,
      config.providerAgentId,
      config.stakeToken,
      config.stakeAmount,
      config.validationRegistry,
      config.breachThreshold,
      setupFee,
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const slaCreatedTopic = keccak256(toHex("SLACreated(address,address,address)"));
  const slaCreatedLog = receipt.logs.find((l) => l.topics[0] === slaCreatedTopic);
  if (!slaCreatedLog) throw new Error("SLACreated event not found");
  const decoded = decodeEventLog({
    abi: [
      {
        type: "event",
        name: "SLACreated",
        inputs: [
          { name: "sla", type: "address", indexed: true },
          { name: "provider", type: "address", indexed: true },
          { name: "consumer", type: "address", indexed: true },
        ],
      },
    ],
    data: slaCreatedLog.data,
    topics: slaCreatedLog.topics,
  });
  const sla = (decoded.args as { sla: Address }).sla;
  return { sla, txHash: hash };
}

export async function getSLAState(
  slaAddress: Address,
  config: { rpcUrl: string }
): Promise<SLAState> {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  const [staked, breached, balance] = await client.readContract({
    address: slaAddress,
    abi: SLA_CONTRACT_ABI,
    functionName: "getState",
  });
  return { staked, breached, balance };
}

export async function slaStake(
  slaAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}` }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  return client!.writeContract({
    address: slaAddress,
    abi: SLA_CONTRACT_ABI,
    functionName: "stake",
  });
}

export async function slaDeclareBreach(
  slaAddress: Address,
  requestHash: `0x${string}`,
  config: { rpcUrl: string; privateKey: `0x${string}` }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  return client!.writeContract({
    address: slaAddress,
    abi: SLA_CONTRACT_ABI,
    functionName: "declareBreach",
    args: [requestHash],
  });
}

export async function slaUnstake(
  slaAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}` }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  return client!.writeContract({
    address: slaAddress,
    abi: SLA_CONTRACT_ABI,
    functionName: "unstake",
  });
}
