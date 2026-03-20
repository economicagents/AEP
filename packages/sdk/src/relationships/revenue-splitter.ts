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
import { REVENUE_SPLITTER_ABI, REVENUE_SPLITTER_FACTORY_ABI } from "../abi.js";
import { baseSepolia } from "../account.js";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";

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
  /** Chain for contract calls. Default baseSepolia. */
  chain?: Chain;
}

export async function createRevenueSplitter(
  config: CreateRevenueSplitterConfig
): Promise<{ splitter: Address; txHash: Hash }> {
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
  config: { rpcUrl: string; chain?: Chain }
): Promise<RevenueSplitterState> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
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
    address: splitterAddress,
    abi: REVENUE_SPLITTER_ABI,
    functionName: "distribute",
  });
}
