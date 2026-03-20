import {
  createPublicClient,
  encodeFunctionData,
  http,
  type Address,
  type Chain,
  type Hash,
  type Hex,
} from "viem";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";
import { privateKeyToAccount } from "viem/accounts";
import {
  createBundlerClient,
  getUserOperationHash,
  toSmartAccount,
  type UserOperation,
} from "viem/account-abstraction";
import { baseSepolia } from "./account.js";
import type { ExecuteCall } from "./types.js";

const AEP_ACCOUNT_ABI = [
  {
    inputs: [
      { name: "dest", type: "address" },
      { name: "value", type: "uint256" },
      { name: "func", type: "bytes" },
    ],
    name: "execute",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { name: "dests", type: "address[]" },
      { name: "values", type: "uint256[]" },
      { name: "funcs", type: "bytes[]" },
    ],
    name: "executeBatch",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
] as const;


export interface ExecuteConfig {
  account: Address;
  privateKey: `0x${string}`;
  rpcUrl: string;
  bundlerRpcUrl: string;
  entryPointAddress: Address;
  chain?: Chain;
}

/**
 * Create an AEP Smart Account for UserOp building and submission.
 */
export async function createAEPAccount(config: {
  account: Address;
  privateKey: `0x${string}`;
  rpcUrl: string;
  entryPointAddress: Address;
  chain?: Chain;
}) {
  const chain = config.chain ?? baseSepolia;
  const client = createPublicClient({
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  const owner = privateKeyToAccount(config.privateKey);

  const entryPointAbi = [
    {
      inputs: [
        { name: "sender", type: "address" },
        { name: "key", type: "uint192" },
      ],
      name: "getNonce",
      outputs: [{ name: "", type: "uint256" }],
      stateMutability: "view",
      type: "function",
    },
  ] as const;

  return toSmartAccount({
    client,
    entryPoint: {
      abi: entryPointAbi,
      address: config.entryPointAddress,
      version: "0.7",
    },
    async getAddress() {
      return config.account;
    },
    async encodeCalls(calls: readonly { to: Address; value?: bigint; data?: Hex }[]) {
      const arr = [...calls];
      if (arr.length === 1) {
        return encodeFunctionData({
          abi: AEP_ACCOUNT_ABI,
          functionName: "execute",
          args: [
            arr[0].to,
            arr[0].value ?? 0n,
            (arr[0].data ?? "0x") as `0x${string}`,
          ],
        });
      }
      return encodeFunctionData({
        abi: AEP_ACCOUNT_ABI,
        functionName: "executeBatch",
        args: [
          arr.map((c) => c.to),
          arr.map((c) => c.value ?? 0n),
          arr.map((c) => (c.data ?? "0x") as `0x${string}`),
        ],
      });
    },
    async getNonce(parameters?: { key?: bigint }) {
      return client.readContract({
        address: config.entryPointAddress,
        abi: [
          {
            inputs: [
              { name: "sender", type: "address" },
              { name: "key", type: "uint192" },
            ],
            name: "getNonce",
            outputs: [{ name: "", type: "uint256" }],
            stateMutability: "view",
            type: "function",
          },
        ],
        functionName: "getNonce",
        args: [config.account, parameters?.key ?? 0n],
      });
    },
    async getFactoryArgs() {
      return { factory: undefined, factoryData: undefined };
    },
    async getStubSignature() {
      return "0x" as Hex;
    },
    async signMessage({ message }) {
      return owner.signMessage({ message });
    },
    async signTypedData(typedData) {
      return owner.signTypedData(typedData);
    },
    async signUserOperation(parameters) {
      const op = parameters as UserOperation<"0.7">;
      const hash = getUserOperationHash({
        chainId: parameters.chainId ?? chain.id,
        entryPointAddress: config.entryPointAddress,
        entryPointVersion: "0.7",
        userOperation: op,
      });
      return owner.signMessage({ message: { raw: hash as Hex } });
    },
  });
}

/**
 * Build and submit a UserOp for execute/executeBatch.
 * Returns the UserOp hash from the bundler.
 */
export async function execute(
  calls: ExecuteCall[],
  config: ExecuteConfig
): Promise<Hash> {
  if (!calls.length) {
    throw new Error("execute requires at least one call");
  }
  const chain = config.chain ?? baseSepolia;
  const client = createPublicClient({
    chain,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  const bundlerClient = createBundlerClient({
    client,
    transport: http(config.bundlerRpcUrl),
  });

  const account = await createAEPAccount({
    account: config.account,
    privateKey: config.privateKey,
    rpcUrl: config.rpcUrl,
    entryPointAddress: config.entryPointAddress,
    chain,
  });

  const hash = await bundlerClient.sendUserOperation({
    account,
    calls: calls.map((c) => ({
      to: c.to,
      value: c.value ?? 0n,
      data: c.data ?? "0x",
    })),
  });

  return hash;
}
