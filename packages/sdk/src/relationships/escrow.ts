import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  keccak256,
  toHex,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { CONDITIONAL_ESCROW_ABI, CONDITIONAL_ESCROW_FACTORY_ABI, ERC20_APPROVE_ABI } from "../abi.js";
import { baseSepolia } from "../account.js";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";

export type EscrowState = 0 | 1 | 2 | 3 | 4; // FUNDED, IN_PROGRESS, VALIDATING, RELEASED, DISPUTED

export interface EscrowStateResult {
  state: EscrowState;
  amount: bigint;
  requestHash: `0x${string}`;
}

export interface CreateEscrowConfig {
  consumer: Address;
  provider: Address;
  providerAgentId: bigint;
  token: Address;
  validationRegistry: Address;
  validatorAddress: Address;
  releaseThreshold?: number;
  factoryAddress: Address;
  rpcUrl: string;
  privateKey: `0x${string}`;
  /** Setup fee in token (6 decimals). Caller pays. Default 0. */
  setupFee?: bigint;
  /** Milestone amounts (6 decimals). Empty for single-amount legacy escrow. */
  milestoneAmounts?: bigint[];
  /** Chain for contract calls. Default baseSepolia. */
  chain?: Chain;
}

export async function createEscrow(config: CreateEscrowConfig): Promise<{ escrow: Address; txHash: Hash }> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const setupFee = config.setupFee ?? 0n;
  const milestoneAmounts = config.milestoneAmounts ?? [];
  if (setupFee > 0n) {
    await client!.writeContract({
      address: config.token,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [config.factoryAddress, setupFee],
    });
  }

  const hash =
    milestoneAmounts.length > 0
      ? await client!.writeContract({
          address: config.factoryAddress,
          abi: CONDITIONAL_ESCROW_FACTORY_ABI,
          functionName: "createEscrowWithMilestones",
          args: [
            config.consumer,
            config.provider,
            config.providerAgentId,
            config.token,
            config.validationRegistry,
            config.validatorAddress,
            config.releaseThreshold ?? 80,
            milestoneAmounts,
            setupFee,
          ],
        })
      : await client!.writeContract({
          address: config.factoryAddress,
          abi: CONDITIONAL_ESCROW_FACTORY_ABI,
          functionName: "createEscrow",
          args: [
            config.consumer,
            config.provider,
            config.providerAgentId,
            config.token,
            config.validationRegistry,
            config.validatorAddress,
            config.releaseThreshold ?? 80,
            setupFee,
          ],
        });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const escrowCreatedTopic = keccak256(toHex("EscrowCreated(address,address,address)"));
  const escrowCreatedLog = receipt.logs.find((l) => l.topics[0] === escrowCreatedTopic);
  if (!escrowCreatedLog) throw new Error("EscrowCreated event not found");
  const decoded = decodeEventLog({
    abi: [
      {
        type: "event",
        name: "EscrowCreated",
        inputs: [
          { name: "escrow", type: "address", indexed: true },
          { name: "consumer", type: "address", indexed: true },
          { name: "provider", type: "address", indexed: true },
        ],
      },
    ],
    data: escrowCreatedLog.data,
    topics: escrowCreatedLog.topics,
  });
  const escrow = (decoded.args as { escrow: Address }).escrow;
  return { escrow, txHash: hash };
}

export async function getEscrowState(
  escrowAddress: Address,
  config: { rpcUrl: string; chain?: Chain }
): Promise<EscrowStateResult> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  const [state, amount, requestHash] = await client.readContract({
    address: escrowAddress,
    abi: CONDITIONAL_ESCROW_ABI,
    functionName: "getState",
  });
  return { state: state as EscrowState, amount, requestHash };
}

export async function escrowFund(
  escrowAddress: Address,
  amount: bigint,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: escrowAddress,
    abi: CONDITIONAL_ESCROW_ABI,
    functionName: "fund",
    args: [amount],
  });
}

export async function escrowAcknowledge(
  escrowAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: escrowAddress,
    abi: CONDITIONAL_ESCROW_ABI,
    functionName: "acknowledge",
  });
}

export async function escrowSubmitForValidation(
  escrowAddress: Address,
  requestHash: `0x${string}`,
  config: { rpcUrl: string; privateKey: `0x${string}`; milestoneIndex?: number; chain?: Chain }
): Promise<Hash> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: escrowAddress,
    abi: CONDITIONAL_ESCROW_ABI,
    functionName: "submitForValidation",
    args: [requestHash, BigInt(config.milestoneIndex ?? 0)],
  });
}

export async function escrowRelease(
  escrowAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}`; milestoneIndex?: number; chain?: Chain }
): Promise<Hash> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: escrowAddress,
    abi: CONDITIONAL_ESCROW_ABI,
    functionName: "release",
    args: [BigInt(config.milestoneIndex ?? 0)],
  });
}

export async function escrowDispute(
  escrowAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const chain = config.chain ?? baseSepolia;
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: escrowAddress,
    abi: CONDITIONAL_ESCROW_ABI,
    functionName: "dispute",
  });
}
