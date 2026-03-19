import {
  createPublicClient,
  createWalletClient,
  decodeEventLog,
  http,
  keccak256,
  toHex,
  type Address,
  type Hash,
} from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { REVENUE_SPLITTER_ABI, REVENUE_SPLITTER_FACTORY_ABI } from "../abi.js";
import { baseSepolia } from "../account.js";

export interface RevenueSplitterState {
  recipients: readonly Address[];
  weights: readonly bigint[];
  balance: bigint;
}

export interface CreateRevenueSplitterConfig {
  recipients: Address[];
  weights: number[];
  token: Address;
  factoryAddress: Address;
  rpcUrl: string;
  privateKey: `0x${string}`;
}

export async function createRevenueSplitter(
  config: CreateRevenueSplitterConfig
): Promise<{ splitter: Address; txHash: Hash }> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });

  const hash = await client!.writeContract({
    address: config.factoryAddress,
    abi: REVENUE_SPLITTER_FACTORY_ABI,
    functionName: "createSplitter",
    args: [config.recipients, config.weights.map((w) => BigInt(w)), config.token],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash });
  const splitterCreatedTopic = keccak256(toHex("SplitterCreated(address,address)"));
  const splitterCreatedLog = receipt.logs.find((l) => l.topics[0] === splitterCreatedTopic);
  if (!splitterCreatedLog) throw new Error("SplitterCreated event not found");
  const decoded = decodeEventLog({
    abi: [
      {
        type: "event",
        name: "SplitterCreated",
        inputs: [
          { name: "splitter", type: "address", indexed: true },
          { name: "token", type: "address", indexed: true },
        ],
      },
    ],
    data: splitterCreatedLog.data,
    topics: splitterCreatedLog.topics,
  });
  const splitter = (decoded.args as { splitter: Address }).splitter;
  return { splitter, txHash: hash };
}

export async function getRevenueSplitterState(
  splitterAddress: Address,
  config: { rpcUrl: string }
): Promise<RevenueSplitterState> {
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  const [recipients, weights, balance] = await client.readContract({
    address: splitterAddress,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "getState",
  });
  return { recipients, weights, balance };
}

export async function splitterDistribute(
  splitterAddress: Address,
  config: { rpcUrl: string; privateKey: `0x${string}` }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });
  return client!.writeContract({
    address: splitterAddress,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "distribute",
  });
}
