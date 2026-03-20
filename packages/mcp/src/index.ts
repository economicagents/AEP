#!/usr/bin/env node

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  getDeposit,
  getPolicyModules,
  rejectPathTraversal,
  getBudgetPolicyState,
  setBudgetCaps,
  setBudgetCapsFull,
  parseIntent,
  getReputationSummary,
  getCreditFacilityState,
  getEscrowState,
  getRevenueSplitterState,
  getSLAState,
  ERC8004_BASE_SEPOLIA,
} from "@economicagents/sdk";
import {
  getAccountAnalytics,
  computeCreditScore,
  getRecommendations,
  getFleetSummary,
  getFleetAlerts,
} from "@economicagents/graph";
import { loadProviders } from "@economicagents/indexer";
import { getSignerAccount } from "@economicagents/keystore";
import { resolveIntent } from "@economicagents/resolver";
import { z } from "zod";

function isAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function getConfigPath(): string {
  const env = process.env.AEP_CONFIG_PATH;
  if (env && env.length > 0) return env;
  return join(homedir(), ".aep", "config.json");
}

const CONFIG_PATH = getConfigPath();
const DEFAULT_RPC =
  process.env.AEP_RPC_URL ?? process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const DEFAULT_INDEX_PATH = join(homedir(), ".aep", "index");
const DEFAULT_GRAPH_PATH = join(homedir(), ".aep", "graph");

interface Config {
  account?: string;
  rpcUrl?: string;
  chainId?: number;
  indexPath?: string;
  graphPath?: string;
  reputationRegistryAddress?: string;
  fleets?: Record<string, { accounts: string[]; name?: string }>;
}

function loadConfig(): Config {
  if (existsSync(CONFIG_PATH)) {
    try {
      const data = JSON.parse(readFileSync(CONFIG_PATH, "utf-8"));
      return {
        account: data.account,
        rpcUrl: data.rpcUrl,
        chainId: data.chainId,
        indexPath: data.indexPath,
        graphPath: data.graphPath,
        reputationRegistryAddress: data.reputationRegistryAddress,
        fleets: data.fleets,
      };
    } catch {
      return {};
    }
  }
  return {};
}

const mcpServer = new McpServer({
  name: "aep-manage-budget",
  version: "0.1.0",
});

mcpServer.registerTool(
  "get_balance",
  {
    description: "Get account deposit (EntryPoint balance) in wei",
    inputSchema: {
      accountAddress: z.string().optional().describe("Account address (default: from config)"),
    },
  },
  async ({ accountAddress }: { accountAddress?: string }) => {
    const config = loadConfig();
    const account = (accountAddress ?? config.account) as `0x${string}` | undefined;
    if (!account) {
      return {
        content: [{ type: "text", text: "Error: account address required (or set in ~/.aep/config.json)" }],
        isError: true,
      };
    }
    try {
      const balance = await getDeposit(account, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      return {
        content: [{ type: "text", text: `Deposit: ${balance.toString()} wei` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "get_policy_state",
  {
    description: "Get BudgetPolicy state (caps and spend) for an account or module",
    inputSchema: {
      accountAddress: z.string().optional().describe("Account address (fetches first BudgetPolicy module)"),
      moduleAddress: z.string().optional().describe("BudgetPolicy module address directly"),
    },
  },
  async ({ accountAddress, moduleAddress }: { accountAddress?: string; moduleAddress?: string }) => {
    const config = loadConfig();
    let moduleAddr = moduleAddress as `0x${string}` | undefined;
    if (!moduleAddr && accountAddress) {
      const modules = await getPolicyModules(accountAddress as `0x${string}`, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      moduleAddr = modules[0];
    }
    if (!moduleAddr && config.account) {
      const modules = await getPolicyModules(config.account as `0x${string}`, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      moduleAddr = modules[0];
    }
    if (!moduleAddr) {
      const msg =
        accountAddress || config.account
          ? "No BudgetPolicy module found for this account"
          : "Error: module address or account address required";
      return {
        content: [{ type: "text", text: msg }],
        isError: true,
      };
    }
    try {
      const state = await getBudgetPolicyState(moduleAddr, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      const lines = [
        `maxPerTx: ${state.maxPerTx}`,
        `maxDaily: ${state.maxDaily}`,
        `maxWeekly: ${state.maxWeekly}`,
        `maxPerTask: ${state.maxPerTask}`,
        `taskWindowSeconds: ${state.taskWindowSeconds}`,
        `spentDaily: ${state.spentDaily}`,
        `spentWeekly: ${state.spentWeekly}`,
        `spentInTask: ${state.spentInTask}`,
      ];
      if (state.maxDaily > 0n) {
        const remaining = state.maxDaily - state.spentDaily;
        lines.push(`remainingDaily: ${remaining > 0n ? remaining : 0n}`);
      }
      if (state.maxWeekly > 0n) {
        const remaining = state.maxWeekly - state.spentWeekly;
        lines.push(`remainingWeekly: ${remaining > 0n ? remaining : 0n}`);
      }
      if (state.maxPerTask > 0n && state.taskWindowSeconds > 0n) {
        const remaining = state.maxPerTask - state.spentInTask;
        lines.push(`remainingTask: ${remaining > 0n ? remaining : 0n}`);
      }
      return {
        content: [{ type: "text", text: lines.join("\n") }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "set_budget_caps",
  {
    description: "Set BudgetPolicy caps (owner only). Requires AEP_KEYSTORE_ACCOUNT or PRIVATE_KEY env. Use full=true for per-task and window params.",
    inputSchema: {
      moduleAddress: z.string().describe("BudgetPolicy module address"),
      maxPerTx: z.string().describe("Max per transaction in wei (0 = unlimited)"),
      maxDaily: z.string().describe("Max daily spend in wei (0 = unlimited)"),
      maxWeekly: z.string().describe("Max weekly spend in wei (0 = unlimited)"),
      maxPerTask: z.string().optional().describe("Max per task in wei (0 = disabled, requires full=true)"),
      taskWindowSeconds: z.string().optional().describe("Task window in seconds (0 = disabled, requires full=true)"),
      dailyWindowSeconds: z.string().optional().describe("Daily window in seconds (0 = 86400, requires full=true)"),
      weeklyWindowSeconds: z.string().optional().describe("Weekly window in seconds (0 = 604800, requires full=true)"),
      full: z.boolean().optional().describe("Use setCapsFull for per-task and configurable windows"),
    },
  },
  async ({
    moduleAddress,
    maxPerTx,
    maxDaily,
    maxWeekly,
    maxPerTask,
    taskWindowSeconds,
    dailyWindowSeconds,
    weeklyWindowSeconds,
    full,
  }: {
    moduleAddress: string;
    maxPerTx: string;
    maxDaily: string;
    maxWeekly: string;
    maxPerTask?: string;
    taskWindowSeconds?: string;
    dailyWindowSeconds?: string;
    weeklyWindowSeconds?: string;
    full?: boolean;
  }) => {
    let signer: { account: { address: string }; privateKey: `0x${string}` };
    try {
      signer = await getSignerAccount();
    } catch {
      return {
        content: [{ type: "text", text: "Error: No signer. Set AEP_KEYSTORE_ACCOUNT (cast wallet import aep --interactive) or PRIVATE_KEY env for set_budget_caps" }],
        isError: true,
      };
    }
    const config = loadConfig();
    try {
      if (full) {
        const hash = await setBudgetCapsFull(
          moduleAddress as `0x${string}`,
          {
            maxPerTx: BigInt(maxPerTx),
            maxDaily: BigInt(maxDaily),
            maxWeekly: BigInt(maxWeekly),
            maxPerTask: BigInt(maxPerTask ?? "0"),
            taskWindowSeconds: BigInt(taskWindowSeconds ?? "0"),
            dailyWindowSeconds: BigInt(dailyWindowSeconds ?? "0"),
            weeklyWindowSeconds: BigInt(weeklyWindowSeconds ?? "0"),
          },
          {
            privateKey: signer.privateKey,
            rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
          }
        );
        return {
          content: [{ type: "text", text: `Policy updated (full). Tx: ${hash}` }],
        };
      }
      const hash = await setBudgetCaps(
        moduleAddress as `0x${string}`,
        {
          maxPerTx: BigInt(maxPerTx),
          maxDaily: BigInt(maxDaily),
          maxWeekly: BigInt(maxWeekly),
        },
        {
          privateKey: signer.privateKey,
          rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
        }
      );
      return {
        content: [{ type: "text", text: `Policy updated. Tx: ${hash}` }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "check_counterparty",
  {
    description:
      "Check counterparty trust via ERC-8004 reputation. Provide agentId for on-chain lookup, or address to lookup in provider index.",
    inputSchema: {
      agentId: z.string().optional().describe("ERC-8004 agent ID (for direct on-chain reputation lookup)"),
      address: z.string().optional().describe("Payment wallet address (lookup in provider index; requires synced index)"),
    },
  },
  async ({ agentId, address }: { agentId?: string; address?: string }) => {
    const config = loadConfig();
    let resolvedAgentId: bigint | undefined;
    if (agentId != null && agentId !== "") {
      try {
        resolvedAgentId = BigInt(agentId);
      } catch {
        return {
          content: [{ type: "text", text: "Error: invalid agentId (expected numeric string)" }],
          isError: true,
        };
      }
    } else if (address != null && address !== "") {
      const indexPath = config.indexPath ?? DEFAULT_INDEX_PATH;
      if (rejectPathTraversal(indexPath)) {
        return {
          content: [{ type: "text", text: "Error: Invalid path (indexPath)" }],
          isError: true,
        };
      }
      const providers = loadProviders(indexPath);
      const normalized = address.toLowerCase();
      const found = providers.find(
        (p) => p.paymentWallet && p.paymentWallet.toLowerCase() === normalized
      );
      if (!found) {
        return {
          content: [
            {
              type: "text",
              text:
                "Error: Address not found in provider index. Provide agentId for on-chain lookup, or run aep-index sync first.",
            },
          ],
          isError: true,
        };
      }
      resolvedAgentId = found.agentId;
    } else {
      return {
        content: [{ type: "text", text: "Error: agentId or address required" }],
        isError: true,
      };
    }
    const reputationRegistry =
      (config.reputationRegistryAddress as `0x${string}`) ??
      ERC8004_BASE_SEPOLIA.reputationRegistry;
    try {
      const summary = await getReputationSummary(resolvedAgentId!, {
        reputationRegistryAddress: reputationRegistry,
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                agentId: resolvedAgentId!.toString(),
                count: summary.count.toString(),
                summaryValue: summary.summaryValue.toString(),
                summaryValueDecimals: summary.summaryValueDecimals,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "credit_state",
  {
    description: "Get CreditFacility state (limit, drawn, balance, frozen, defaulted, repaymentDeadline)",
    inputSchema: {
      facilityAddress: z.string().describe("Credit facility contract address"),
    },
  },
  async ({ facilityAddress }: { facilityAddress: string }) => {
    const config = loadConfig();
    try {
      const state = await getCreditFacilityState(facilityAddress as `0x${string}`, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                limit: state.limit.toString(),
                drawn: state.drawn.toString(),
                balance: state.balance.toString(),
                frozen: state.frozen,
                defaulted: state.defaulted,
                repaymentDeadline: state.repaymentDeadline.toString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "escrow_state",
  {
    description: "Get ConditionalEscrow state (state, amount, requestHash)",
    inputSchema: {
      escrowAddress: z.string().describe("Escrow contract address"),
    },
  },
  async ({ escrowAddress }: { escrowAddress: string }) => {
    const config = loadConfig();
    try {
      const state = await getEscrowState(escrowAddress as `0x${string}`, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      const stateNames = ["FUNDED", "IN_PROGRESS", "VALIDATING", "RELEASED", "DISPUTED"];
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                state: stateNames[state.state] ?? state.state,
                amount: state.amount.toString(),
                requestHash: state.requestHash,
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "splitter_state",
  {
    description: "Get RevenueSplitter state (recipients, weights, balance)",
    inputSchema: {
      splitterAddress: z.string().describe("Revenue splitter contract address"),
    },
  },
  async ({ splitterAddress }: { splitterAddress: string }) => {
    const config = loadConfig();
    try {
      const state = await getRevenueSplitterState(splitterAddress as `0x${string}`, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                recipients: state.recipients,
                weights: state.weights.map((w) => w.toString()),
                balance: state.balance.toString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "sla_state",
  {
    description: "Get SLAContract state (staked, breached, balance)",
    inputSchema: {
      slaAddress: z.string().describe("SLA contract address"),
    },
  },
  async ({ slaAddress }: { slaAddress: string }) => {
    const config = loadConfig();
    try {
      const state = await getSLAState(slaAddress as `0x${string}`, {
        rpcUrl: config.rpcUrl ?? DEFAULT_RPC,
      });
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              {
                staked: state.staked,
                breached: state.breached,
                balance: state.balance.toString(),
              },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "get_analytics",
  {
    description: "Get account analytics (P&L, spend patterns, counterparty analysis)",
    inputSchema: {
      accountAddress: z.string().describe("Account address"),
      graphPath: z.string().optional().describe("Graph storage path (default: ~/.aep/graph)"),
    },
  },
  async ({ accountAddress, graphPath }: { accountAddress: string; graphPath?: string }) => {
    const config = loadConfig();
    const gp = graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    if (rejectPathTraversal(gp)) {
      return { content: [{ type: "text", text: "Error: Invalid path (graphPath)" }], isError: true };
    }
    try {
      const analytics = getAccountAnalytics(gp, accountAddress);
      if (!analytics) {
        return {
          content: [{ type: "text", text: "No analytics for address (run 'aep graph sync' first)" }],
          isError: true,
        };
      }
      return {
        content: [{ type: "text", text: JSON.stringify(analytics, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "get_credit_score",
  {
    description: "Get credit score for an account (0-1, with factor breakdown)",
    inputSchema: {
      accountAddress: z.string().describe("Account address"),
      graphPath: z.string().optional().describe("Graph storage path (default: ~/.aep/graph)"),
    },
  },
  async ({ accountAddress, graphPath }: { accountAddress: string; graphPath?: string }) => {
    const config = loadConfig();
    const gp = graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    if (rejectPathTraversal(gp)) {
      return { content: [{ type: "text", text: "Error: Invalid path (graphPath)" }], isError: true };
    }
    try {
      const result = computeCreditScore(gp, accountAddress);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "get_recommendations",
  {
    description: "Get provider recommendations (collaborative filtering: agents like yours also used X)",
    inputSchema: {
      accountAddress: z.string().describe("Account address"),
      graphPath: z.string().optional().describe("Graph storage path (default: ~/.aep/graph)"),
      indexPath: z.string().optional().describe("Provider index path (default: ~/.aep/index)"),
      capability: z.string().optional().describe("Filter by capability"),
      limit: z.number().optional().describe("Max recommendations (default: 5)"),
    },
  },
  async ({
    accountAddress,
    graphPath,
    indexPath,
    capability,
    limit,
  }: {
    accountAddress: string;
    graphPath?: string;
    indexPath?: string;
    capability?: string;
    limit?: number;
  }) => {
    const config = loadConfig();
    const gp = graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    const ip = indexPath ?? config.indexPath ?? DEFAULT_INDEX_PATH;
    if (rejectPathTraversal(gp) || rejectPathTraversal(ip)) {
      return { content: [{ type: "text", text: "Error: Invalid path (graphPath or indexPath)" }], isError: true };
    }
    try {
      const providers = loadProviders(ip);
      const recs = getRecommendations(gp, providers, accountAddress, capability, limit ?? 5);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              recs.map((r) => ({ ...r, agentId: r.agentId.toString() })),
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "fleet_summary",
  {
    description: "Get fleet summary (aggregate analytics for multiple accounts)",
    inputSchema: {
      fleetId: z.string().describe("Fleet ID from config"),
      graphPath: z.string().optional().describe("Graph path (default: ~/.aep/graph)"),
    },
  },
  async ({ fleetId, graphPath }: { fleetId: string; graphPath?: string }) => {
    const config = loadConfig();
    const gp = graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    if (rejectPathTraversal(gp)) {
      return { content: [{ type: "text", text: "Error: Invalid path (graphPath)" }], isError: true };
    }
    const fleets = config.fleets ?? {};
    const fleet = fleets[fleetId];
    if (!fleet || !fleet.accounts?.length) {
      return {
        content: [{ type: "text", text: `Error: Fleet ${fleetId} not found in config` }],
        isError: true,
      };
    }
    try {
      const summary = getFleetSummary(gp, fleet.accounts);
      return {
        content: [{ type: "text", text: JSON.stringify(summary, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "fleet_accounts",
  {
    description: "List accounts in a fleet with per-account analytics",
    inputSchema: {
      fleetId: z.string().describe("Fleet ID from config"),
      graphPath: z.string().optional().describe("Graph path (default: ~/.aep/graph)"),
    },
  },
  async ({ fleetId, graphPath }: { fleetId: string; graphPath?: string }) => {
    const config = loadConfig();
    const gp = graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    if (rejectPathTraversal(gp)) {
      return { content: [{ type: "text", text: "Error: Invalid path (graphPath)" }], isError: true };
    }
    const fleets = config.fleets ?? {};
    const fleet = fleets[fleetId];
    if (!fleet || !fleet.accounts?.length) {
      return {
        content: [{ type: "text", text: `Error: Fleet ${fleetId} not found in config` }],
        isError: true,
      };
    }
    try {
      const summary = getFleetSummary(gp, fleet.accounts);
      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(
              { accounts: summary.accounts, name: fleet.name },
              null,
              2
            ),
          },
        ],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "fleet_alerts",
  {
    description: "Get fleet alerts (on-chain security events: Frozen, DefaultDeclared, BreachDeclared, etc.)",
    inputSchema: {
      fleetId: z.string().describe("Fleet ID from config"),
      graphPath: z.string().optional().describe("Graph path (default: ~/.aep/graph)"),
      rpcUrl: z.string().optional().describe("RPC URL (default: from config or ~/.aep)"),
      fromBlock: z.number().optional().describe("From block (default: toBlock - 50000)"),
      toBlock: z.number().optional().describe("To block (default: latest)"),
    },
  },
  async ({
    fleetId,
    graphPath,
    rpcUrl,
    fromBlock,
    toBlock,
  }: {
    fleetId: string;
    graphPath?: string;
    rpcUrl?: string;
    fromBlock?: number;
    toBlock?: number;
  }) => {
    const config = loadConfig();
    const gp = graphPath ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    const rpc = rpcUrl ?? config.rpcUrl ?? DEFAULT_RPC;
    if (rejectPathTraversal(gp)) {
      return { content: [{ type: "text", text: "Error: Invalid path (graphPath)" }], isError: true };
    }
    const fleets = config.fleets ?? {};
    const fleet = fleets[fleetId];
    if (!fleet || !fleet.accounts?.length) {
      return {
        content: [{ type: "text", text: `Error: Fleet ${fleetId} not found in config` }],
        isError: true,
      };
    }
    try {
      const chainId =
        config.chainId ??
        parseInt(process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532", 10);
      const options: { fromBlock?: number; toBlock?: number; chainId?: number } = {};
      if (fromBlock != null && fromBlock >= 0) options.fromBlock = fromBlock;
      if (toBlock != null && toBlock >= 0) options.toBlock = toBlock;
      options.chainId = chainId;
      const alerts = await getFleetAlerts(gp, rpc, fleet.accounts, options);
      return {
        content: [{ type: "text", text: JSON.stringify({ alerts }, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

mcpServer.registerTool(
  "resolve_intent",
  {
    description: "Resolve an economic intent to an optimal execution plan (provider list)",
    inputSchema: {
      capability: z.string().describe("Natural language description of needed service (e.g. image classification)"),
      max_per_unit: z.string().optional().describe("Max price per unit in USD (e.g. 0.02)"),
      max_total: z.string().optional().describe("Max total budget in USD (e.g. 1.00)"),
      min_reputation: z.number().optional().describe("Minimum reputation score 0-1"),
      required_validation: z
        .enum(["optimistic", "zk", "tee", "any"])
        .optional()
        .describe("Required validation type"),
      account_address: z.string().optional().describe("Account address for recommendation boost (default: from config)"),
      graph_path: z.string().optional().describe("Graph path for recommendation boost (default: ~/.aep/graph)"),
    },
  },
  async ({
    capability,
    max_per_unit,
    max_total,
    min_reputation,
    required_validation,
    account_address,
    graph_path,
  }: {
    capability: string;
    max_per_unit?: string;
    max_total?: string;
    min_reputation?: number;
    required_validation?: "optimistic" | "zk" | "tee" | "any";
    account_address?: string;
    graph_path?: string;
  }) => {
    const config = loadConfig();
    const indexPath = config.indexPath ?? DEFAULT_INDEX_PATH;
    const graphPath = graph_path ?? config.graphPath ?? DEFAULT_GRAPH_PATH;
    if (rejectPathTraversal(indexPath) || rejectPathTraversal(graphPath)) {
      return { content: [{ type: "text", text: "Error: Invalid path (indexPath or graphPath)" }], isError: true };
    }
    try {
      const intent = parseIntent({
        capability,
        budget: {
          max_per_unit: max_per_unit ?? "999999",
          max_total: max_total ?? "999999",
          currency: "USDC",
        },
        trust: {
          min_reputation: min_reputation,
          required_validation: required_validation ?? "any",
        },
      });
      const account = account_address ?? config.account;
      const plan = await resolveIntent(intent, {
        indexPath,
        accountAddress: account && isAddress(account) ? (account as `0x${string}`) : undefined,
        graphPath,
      });
      return {
        content: [{ type: "text", text: JSON.stringify(plan, null, 2) }],
      };
    } catch (err) {
      return {
        content: [{ type: "text", text: `Error: ${err instanceof Error ? err.message : String(err)}` }],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await mcpServer.connect(transport);
}

main().catch((error) => {
  console.error("Server error:", error);
  process.exit(1);
});
