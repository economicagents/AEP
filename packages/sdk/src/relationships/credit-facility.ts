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
import { CREDIT_FACILITY_ABI, CREDIT_FACILITY_FACTORY_ABI, ERC20_APPROVE_ABI } from "../abi.js";
import { baseSepolia } from "../account.js";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";

export interface CreditFacilityState {
  limit: bigint;
  drawn: bigint;
  balance: bigint;
  frozen: boolean;
  defaulted: boolean;
  repaymentDeadline: bigint;
}

export interface CreateCreditFacilityConfig {
  lender: Address;
  borrower: Address;
  token: Address;
  limit: bigint;
  minReputation: number;
  repaymentInterval: number;
  reputationRegistry: Address;
  identityRegistry: Address;
  borrowerAgentId: bigint;
  factoryAddress: Address;
  rpcUrl: string;
  privateKey: `0x${string}`;
  /** Origination fee in token (6 decimals). Lender pays. Default 0. */
  originationFee?: bigint;
  /** Chain for contract calls. Default baseSepolia. */
  chain?: Chain;
}

export async function createCreditFacility(config: CreateCreditFacilityConfig): Promise<{ facility: Address; txHash: Hash }> {
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

  const fee = config.originationFee ?? 0n;
  if (fee > 0n) {
    if (account.address !== config.lender) {
      throw new Error(
        "When originationFee > 0, the lender must sign the transaction. The lender must approve the factory for the fee amount before creating."
      );
    }
    await client!.writeContract({
      address: config.token,
      abi: ERC20_APPROVE_ABI,
      functionName: "approve",
      args: [config.factoryAddress, fee],
    });
  }

  const hash = await client!.writeContract({
    address: config.factoryAddress,
    abi: CREDIT_FACILITY_FACTORY_ABI,
    functionName: "createFacility",
    args: [
      config.lender,
      config.borrower,
      config.token,
      config.limit,
      BigInt(config.minReputation),
      BigInt(config.repaymentInterval),
      config.reputationRegistry,
      config.identityRegistry,
      config.borrowerAgentId,
      fee,
    ],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const facilityCreatedTopic = keccak256(toHex("FacilityCreated(address,address,address)"));
  const facilityCreatedLog = receipt.logs.find((l) => l.topics[0] === facilityCreatedTopic);
  if (!facilityCreatedLog) throw new Error("FacilityCreated event not found");
  const decoded = decodeEventLog({
    abi: [
      {
        type: "event",
        name: "FacilityCreated",
        inputs: [
          { name: "facility", type: "address", indexed: true },
          { name: "lender", type: "address", indexed: true },
          { name: "borrower", type: "address", indexed: true },
        ],
      },
    ],
    data: facilityCreatedLog.data,
    topics: facilityCreatedLog.topics,
  });
  const facility = (decoded.args as { facility: Address }).facility;
  return { facility, txHash: hash };
}

export async function getCreditFacilityState(
  facilityAddress: Address,
  config: { rpcUrl: string; chain?: Chain }
): Promise<CreditFacilityState> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  const [limit, drawn, balance, frozen, defaulted, repaymentDeadline] = await client.readContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "getState",
  });
  return { limit, drawn, balance, frozen, defaulted, repaymentDeadline };
}

export async function creditDeposit(
  facilityAddress: Address,
  amount: bigint,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "deposit",
    args: [amount],
  });
}

export async function creditDraw(
  facilityAddress: Address,
  amount: bigint,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "draw",
    args: [amount],
  });
}

export async function creditRepay(
  facilityAddress: Address,
  amount: bigint,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "repay",
    args: [amount],
  });
}

export async function creditFreeze(
  facilityAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "freeze",
  });
}

export async function creditUnfreeze(
  facilityAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "unfreeze",
  });
}

export async function creditDeclareDefault(
  facilityAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "declareDefault",
  });
}

export async function creditWithdraw(
  facilityAddress: Address,
  amount: bigint,
  config: { rpcUrl: string; privateKey: `0x${string}`; chain?: Chain }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  return client!.writeContract({
    address: facilityAddress,
    abi: CREDIT_FACILITY_ABI,
    functionName: "withdraw",
    args: [amount],
  });
}
