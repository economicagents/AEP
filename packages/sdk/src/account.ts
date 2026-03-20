import {
  createPublicClient,
  createWalletClient,
  keccak256,
  toHex,
  type Address,
  type Chain,
  type Hash,
} from "viem";
import { transportFromRpcUrl } from "@economicagents/viem-rpc";
import { privateKeyToAccount } from "viem/accounts";
import {
  AEP_ACCOUNT_ABI,
  AEP_ACCOUNT_FACTORY_ABI,
  BUDGET_POLICY_ABI,
  BUDGET_POLICY_DETECT_ABI,
  COUNTERPARTY_POLICY_ABI,
  COUNTERPARTY_POLICY_DETECT_ABI,
  ERC8004_REPUTATION_ABI,
  POLICY_CHECK_ABI,
  RATE_LIMIT_POLICY_ABI,
  RATE_LIMIT_POLICY_DETECT_ABI,
} from "./abi.js";
import type { CreateAccountOptions } from "./types.js";

const BASE_SEPOLIA = {
  id: 84532,
  name: "Base Sepolia",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://sepolia.base.org"] },
  },
} as const satisfies Chain;

export const baseSepolia = BASE_SEPOLIA;

const BASE_MAINNET = {
  id: 8453,
  name: "Base",
  nativeCurrency: { name: "Ether", symbol: "ETH", decimals: 18 },
  rpcUrls: {
    default: { http: ["https://mainnet.base.org"] },
  },
} as const satisfies Chain;

/** viem `Chain` for Base mainnet (chain id 8453). */
export const baseMainnet = BASE_MAINNET;

/** ERC-8004 canonical registry addresses on Base Sepolia */
export const ERC8004_BASE_SEPOLIA = {
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address,
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address,
  validationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272" as Address,
};

/** USDC on Base Sepolia */
export const USDC_BASE_SEPOLIA = "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address;

/** ERC-8004 canonical registry addresses on Base (mainnet) */
export const ERC8004_BASE_MAINNET = {
  identityRegistry: "0x8004A169FB4a3325136EB29fA0ceB6D2e539a432" as Address,
  reputationRegistry: "0x8004BAa17C55a88189AE136b182e5fdA19dE9b63" as Address,
  validationRegistry: "0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58" as Address,
};

/** USDC on Base (mainnet) */
export const USDC_BASE_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address;

/**
 * Get the predicted CREATE2 address for an AEP account.
 */
export async function getAccountAddress(
  owner: Address,
  salt: `0x${string}`,
  config: {
    factoryAddress: Address;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Address> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  return client.readContract({
    address: config.factoryAddress,
    abi: AEP_ACCOUNT_FACTORY_ABI,
    functionName: "getAccountAddress",
    args: [owner, salt as `0x${string}` & { readonly length: 32 }],
  });
}

/**
 * Deploy a new AEP account via the factory.
 */
export async function createAccount(
  options: CreateAccountOptions & { privateKey: `0x${string}` }
): Promise<{ account: Address; txHash: Hash }> {
  const account = privateKeyToAccount(options.privateKey);
  const client = createWalletClient({
    account,
    chain: options.chain,
    transport: transportFromRpcUrl(options.rpcUrl),
  });

  const publicClient = createPublicClient({
    chain: options.chain,
    transport: transportFromRpcUrl(options.rpcUrl),
  });

  const salt = options.salt ?? (`0x${"0".repeat(64)}` as `0x${string}`);

  const hash = await client.writeContract({
    address: options.factoryAddress,
    abi: AEP_ACCOUNT_FACTORY_ABI,
    functionName: "deployAccount",
    args: [options.owner, salt as `0x${string}` & { readonly length: 32 }],
  });

  const receipt = await publicClient.waitForTransactionReceipt({ hash, confirmations: 1 });

  const accountDeployedTopic = keccak256(toHex("AccountDeployed(address,address,bytes32)"));
  const log = receipt.logs.find((l) => l.topics[0] === accountDeployedTopic);
  const accountAddress: Address = log
    ? (("0x" + (log.topics[1]?.slice(-40) ?? "")) as Address)
    : await getAccountAddress(options.owner, salt, {
        factoryAddress: options.factoryAddress,
        rpcUrl: options.rpcUrl,
        chain: options.chain,
      });

  return { account: accountAddress, txHash: hash };
}

/**
 * Check if a payment would pass policy (for x402 interceptor).
 */
export async function checkPolicy(
  accountAddress: Address,
  amount: bigint,
  recipient: Address,
  config: {
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<boolean> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  return client.readContract({
    address: accountAddress,
    abi: AEP_ACCOUNT_ABI,
    functionName: "checkPolicy",
    args: [amount, recipient],
  });
}

export type PolicyCheckReason =
  | "BUDGET_EXCEEDED"
  | "COUNTERPARTY_BLOCKED"
  | "REPUTATION_TOO_LOW"
  | "RATE_LIMIT"
  | "UNKNOWN";

/**
 * Check policy with detailed reason. Tries each module and returns the first failing reason.
 */
export async function checkPolicyDetailed(
  accountAddress: Address,
  amount: bigint,
  recipient: Address,
  config: {
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<{ allowed: boolean; reason?: PolicyCheckReason }> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const modules = await getPolicyModules(accountAddress, config);
  for (const moduleAddr of modules) {
    try {
      const allowed = await client.readContract({
        address: moduleAddr,
        abi: POLICY_CHECK_ABI,
        functionName: "checkPolicy",
        args: [amount, recipient],
      });
      if (!allowed) {
        let reason: PolicyCheckReason = "UNKNOWN";
        try {
          await client.readContract({
            address: moduleAddr,
            abi: BUDGET_POLICY_DETECT_ABI,
            functionName: "maxPerTx",
          });
          reason = "BUDGET_EXCEEDED";
        } catch {
        try {
          await client.readContract({
            address: moduleAddr,
            abi: COUNTERPARTY_POLICY_DETECT_ABI,
            functionName: "identityRegistry",
          });
          try {
            const denyReason = await client.readContract({
              address: moduleAddr,
              abi: COUNTERPARTY_POLICY_DETECT_ABI,
              functionName: "getDenyReason",
              args: [recipient],
            });
            reason = denyReason === 3 ? "REPUTATION_TOO_LOW" : "COUNTERPARTY_BLOCKED";
          } catch {
            reason = "COUNTERPARTY_BLOCKED";
          }
        } catch {
            try {
              await client.readContract({
                address: moduleAddr,
                abi: RATE_LIMIT_POLICY_DETECT_ABI,
                functionName: "maxTxPerWindow",
              });
              reason = "RATE_LIMIT";
            } catch {
              /* keep UNKNOWN */
            }
          }
        }
        return { allowed: false, reason };
      }
    } catch {
      return { allowed: false, reason: "UNKNOWN" };
    }
  }
  return { allowed: true };
}

/**
 * Get account deposit (EntryPoint balance).
 */
export async function getDeposit(
  accountAddress: Address,
  config: {
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<bigint> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  return client.readContract({
    address: accountAddress,
    abi: AEP_ACCOUNT_ABI,
    functionName: "getDeposit",
  });
}

/**
 * Set account frozen state (owner only).
 */
export async function setFrozen(
  accountAddress: Address,
  frozen: boolean,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: accountAddress,
    abi: AEP_ACCOUNT_ABI,
    functionName: "setFrozen",
    args: [frozen],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Get policy module addresses for an account.
 */
export async function getPolicyModules(
  accountAddress: Address,
  config: {
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Address[]> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const len = await client.readContract({
    address: accountAddress,
    abi: AEP_ACCOUNT_ABI,
    functionName: "getPolicyModulesLength",
  });

  const modules: Address[] = [];
  for (let i = 0; i < Number(len); i++) {
    const addr = await client.readContract({
      address: accountAddress,
      abi: AEP_ACCOUNT_ABI,
      functionName: "policyModules",
      args: [BigInt(i)],
    });
    modules.push(addr);
  }
  return modules;
}

export interface BudgetPolicyState {
  maxPerTx: bigint;
  maxDaily: bigint;
  maxWeekly: bigint;
  maxPerTask: bigint;
  taskWindowSeconds: bigint;
  dailyWindowSeconds: bigint;
  weeklyWindowSeconds: bigint;
  spentDaily: bigint;
  spentWeekly: bigint;
  spentInTask: bigint;
}

/**
 * Get BudgetPolicy state (caps and spend).
 */
export async function getBudgetPolicyState(
  policyAddress: Address,
  config: {
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<BudgetPolicyState> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const [
    maxPerTx,
    maxDaily,
    maxWeekly,
    maxPerTask,
    taskWindowSeconds,
    dailyWindowSeconds,
    weeklyWindowSeconds,
    spentDaily,
    spentWeekly,
    spentInTask,
  ] = await Promise.all([
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "maxPerTx" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "maxDaily" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "maxWeekly" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "maxPerTask" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "taskWindowSeconds" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "dailyWindowSeconds" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "weeklyWindowSeconds" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "spentDaily" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "spentWeekly" }),
    client.readContract({ address: policyAddress, abi: BUDGET_POLICY_ABI, functionName: "spentInTask" }),
  ]);

  return {
    maxPerTx,
    maxDaily,
    maxWeekly,
    maxPerTask,
    taskWindowSeconds,
    dailyWindowSeconds,
    weeklyWindowSeconds,
    spentDaily,
    spentWeekly,
    spentInTask,
  };
}

/**
 * Set BudgetPolicy caps (owner only). Preserves per-task and window config.
 */
export async function setBudgetCaps(
  policyAddress: Address,
  caps: { maxPerTx: bigint; maxDaily: bigint; maxWeekly: bigint },
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: BUDGET_POLICY_ABI,
    functionName: "setCaps",
    args: [caps.maxPerTx, caps.maxDaily, caps.maxWeekly],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set BudgetPolicy caps including per-task and configurable windows (owner only).
 */
export async function setBudgetCapsFull(
  policyAddress: Address,
  caps: {
    maxPerTx: bigint;
    maxDaily: bigint;
    maxWeekly: bigint;
    maxPerTask: bigint;
    taskWindowSeconds: bigint;
    dailyWindowSeconds: bigint;
    weeklyWindowSeconds: bigint;
  },
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: BUDGET_POLICY_ABI,
    functionName: "setCapsFull",
    args: [
      caps.maxPerTx,
      caps.maxDaily,
      caps.maxWeekly,
      caps.maxPerTask,
      caps.taskWindowSeconds,
      caps.dailyWindowSeconds,
      caps.weeklyWindowSeconds,
    ],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set RateLimitPolicy limits (owner only).
 */
export async function setRateLimits(
  policyAddress: Address,
  limits: { maxTxPerWindow: bigint; windowSeconds: bigint },
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: RATE_LIMIT_POLICY_ABI,
    functionName: "setLimits",
    args: [limits.maxTxPerWindow, limits.windowSeconds],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

export interface ReputationSummary {
  count: bigint;
  summaryValue: bigint;
  summaryValueDecimals: number;
}

/**
 * Get reputation summary for an agent (getClients + getSummary).
 */
export async function getReputationSummary(
  agentId: bigint,
  config: {
    reputationRegistryAddress: Address;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<ReputationSummary> {
  const client = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const clients = await client.readContract({
    address: config.reputationRegistryAddress,
    abi: ERC8004_REPUTATION_ABI,
    functionName: "getClients",
    args: [agentId],
  });

  if (clients.length === 0) {
    return { count: 0n, summaryValue: 0n, summaryValueDecimals: 0 };
  }

  const [count, summaryValue, summaryValueDecimals] = await client.readContract({
    address: config.reputationRegistryAddress,
    abi: ERC8004_REPUTATION_ABI,
    functionName: "getSummary",
    args: [agentId, clients, "", ""],
  });

  return {
    count,
    summaryValue: BigInt(summaryValue),
    summaryValueDecimals: Number(summaryValueDecimals),
  };
}

/**
 * Set CounterpartyPolicy reputation registry (owner only).
 */
export async function setReputationRegistry(
  policyAddress: Address,
  registryAddress: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "setReputationRegistry",
    args: [registryAddress],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set CounterpartyPolicy min-reputation threshold (owner only).
 * @param minReputation - Minimum reputation value (int128)
 * @param decimals - Decimal places (0 = disabled)
 */
export async function setMinReputation(
  policyAddress: Address,
  minReputation: bigint,
  decimals: number,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "setMinReputation",
    args: [BigInt(minReputation), decimals],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set CounterpartyPolicy identity registry (owner only).
 */
export async function setIdentityRegistry(
  policyAddress: Address,
  registryAddress: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "setIdentityRegistry",
    args: [registryAddress],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set CounterpartyPolicy use allow list (owner only).
 */
export async function setUseAllowList(
  policyAddress: Address,
  use: boolean,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "setUseAllowList",
    args: [use],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set CounterpartyPolicy use agent allow list (owner only).
 */
export async function setUseAgentAllowList(
  policyAddress: Address,
  use: boolean,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "setUseAgentAllowList",
    args: [use],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Set CounterpartyPolicy use global min-reputation (owner only).
 * When true, only verified agents with reputation >= min can receive payments.
 */
export async function setUseGlobalMinReputation(
  policyAddress: Address,
  use: boolean,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "setUseGlobalMinReputation",
    args: [use],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Add agent to CounterpartyPolicy verified set (owner only).
 * Fetches wallet from Identity Registry and stores for global min-reputation checks.
 */
export async function addVerifiedAgent(
  policyAddress: Address,
  agentId: bigint,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "addVerifiedAgent",
    args: [agentId],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Remove wallet from CounterpartyPolicy verified set (owner only).
 */
export async function removeVerifiedAgent(
  policyAddress: Address,
  wallet: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "removeVerifiedAgent",
    args: [wallet],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Add address to CounterpartyPolicy allow list (owner only).
 */
export async function addToAllowList(
  policyAddress: Address,
  addr: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "addToAllowList",
    args: [addr],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Remove address from CounterpartyPolicy allow list (owner only).
 */
export async function removeFromAllowList(
  policyAddress: Address,
  addr: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "removeFromAllowList",
    args: [addr],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Add address to CounterpartyPolicy block list (owner only).
 */
export async function addToBlockList(
  policyAddress: Address,
  addr: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "addToBlockList",
    args: [addr],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Remove address from CounterpartyPolicy block list (owner only).
 */
export async function removeFromBlockList(
  policyAddress: Address,
  addr: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "removeFromBlockList",
    args: [addr],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Add agent ID to CounterpartyPolicy agent allow list (owner only).
 */
export async function addAgentToAllowList(
  policyAddress: Address,
  agentId: bigint,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "addAgentToAllowList",
    args: [agentId],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}

/**
 * Clear CounterpartyPolicy agent allow list (owner only).
 */
export async function clearAgentAllowList(
  policyAddress: Address,
  config: {
    privateKey: `0x${string}`;
    rpcUrl: string;
    chain?: Chain;
  }
): Promise<Hash> {
  const account = privateKeyToAccount(config.privateKey);
  const client = createWalletClient({
    account,
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });

  const hash = await client.writeContract({
    address: policyAddress,
    abi: COUNTERPARTY_POLICY_ABI,
    functionName: "clearAgentAllowList",
    args: [],
  });

  const publicClient = createPublicClient({
    chain: config.chain ?? baseSepolia,
    transport: transportFromRpcUrl(config.rpcUrl),
  });
  await publicClient.waitForTransactionReceipt({ hash });
  return hash;
}
