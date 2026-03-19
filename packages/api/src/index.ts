#!/usr/bin/env node

/**
 * REST API for AEP intent resolver and Phase 4 analytics.
 * POST /resolve - body: intent JSON, returns execution plan.
 * GET /analytics/account/:address - P&L, spend patterns, counterparty analysis.
 * GET /analytics/credit-score/:address - credit score.
 * GET /analytics/recommendations/:address - provider recommendations.
 * POST /graphql - GraphQL API for analytics.
 * When AEP_TREASURY_ADDRESS (or treasuryAddress in config) and AEP_RESOLVE_PRICE are set, POST /resolve is gated via x402.
 */

import { Hono, type Context } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { paymentMiddleware } from "x402-hono";
import { graphqlServer } from "@hono/graphql-server";
import { buildSchema } from "graphql";
import { parseIntent, rejectPathTraversal, isValidProbeUrl } from "@economicagents/sdk";
import { resolveIntent } from "@economicagents/resolver";
import { loadProviders, probeX402Endpoint } from "@economicagents/indexer";
import { isAddress } from "viem";
import { getSignerAccount } from "@economicagents/keystore";
import {
  getAccountAnalytics,
  getAccountAnalyticsInRange,
  computeCreditScore,
  computeCreditScoreInRange,
  getPaymentTrends,
  exportPaymentsCsv,
  getBlockRangeForPeriod,
  getFleetSummary,
  getFleetAlerts,
  getRecommendations,
} from "@economicagents/graph";

const DEFAULT_INDEX_PATH = join(homedir(), ".aep", "index");
const DEFAULT_GRAPH_PATH = join(homedir(), ".aep", "graph");
const DEFAULT_RPC =
  process.env.AEP_RPC_URL ?? process.env.BASE_SEPOLIA_RPC ?? "https://sepolia.base.org";
const DEFAULT_ENTRYPOINT = "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as const;

const DEFAULT_PORT = 3847;
const DEFAULT_RESOLVE_PRICE = "0.005"; // $0.005 per resolve (Standard tier)
const DEFAULT_RESOLVE_PRICE_PREMIUM = "0.02"; // $0.02 per resolve (Premium tier)
const PROBE_BATCH_MAX = 50;

const allowPrivateProbe = process.env.AEP_PROBE_ALLOW_PRIVATE !== "false";

interface Config {
  indexPath?: string;
  graphPath?: string;
  rpcUrl?: string;
  chainId?: number;
  treasuryAddress?: string;
  fleets?: Record<
    string,
    { accounts: string[]; name?: string }
  >;
}

function getConfigPath(): string {
  const env = process.env.AEP_CONFIG_PATH;
  if (env && env.length > 0) return env;
  return join(homedir(), ".aep", "config.json");
}

function loadConfig(): Config {
  const configPath = getConfigPath();
  if (existsSync(configPath)) {
    try {
      const data = JSON.parse(readFileSync(configPath, "utf-8"));
      return {
        indexPath: data.indexPath,
        graphPath: data.graphPath,
        rpcUrl: data.rpcUrl,
        chainId: data.chainId,
        treasuryAddress: data.treasuryAddress,
        fleets: data.fleets,
      };
    } catch {
      return {};
    }
  }
  return {};
}

const startupConfig = loadConfig();
const resolvePrice = process.env.AEP_RESOLVE_PRICE ?? DEFAULT_RESOLVE_PRICE;
const resolvePricePremium = process.env.AEP_RESOLVE_PRICE_PREMIUM ?? DEFAULT_RESOLVE_PRICE_PREMIUM;
const network = (process.env.AEP_NETWORK ?? "base-sepolia") as "base" | "base-sepolia";

async function resolveTreasuryAddress(): Promise<`0x${string}` | undefined> {
  if (process.env.AEP_TREASURY_ADDRESS) {
    return process.env.AEP_TREASURY_ADDRESS as `0x${string}`;
  }
  if (startupConfig.treasuryAddress) {
    return startupConfig.treasuryAddress as `0x${string}`;
  }
  try {
    const { account } = await getSignerAccount();
    return account.address;
  } catch {
    return undefined;
  }
}

const app = new Hono();

app.use("*", cors());

async function configurePaywallAndStart() {
  const treasuryAddress = await resolveTreasuryAddress();
  const paywallEnabled = Boolean(
    treasuryAddress && treasuryAddress.startsWith("0x") && treasuryAddress.length === 42
  );

  if (paywallEnabled) {
    app.use(
      paymentMiddleware(treasuryAddress!, {
        "/resolve": {
          price: `$${resolvePrice}`,
          network,
          config: {
            description: "Resolve an economic intent against the AEP provider index (Standard)",
          },
        },
        "/resolve/premium": {
          price: `$${resolvePricePremium}`,
          network,
          config: {
            description: "Premium resolution with priority handling",
          },
        },
      })
    );
    console.log(
      `x402 paywall enabled: POST /resolve = $${resolvePrice}, POST /resolve/premium = $${resolvePricePremium} (payTo: ${treasuryAddress})`
    );
  } else {
    console.log("x402 paywall disabled (set AEP_TREASURY_ADDRESS or treasuryAddress in ~/.aep/config.json to enable)");
  }

  const port = parseInt(process.env.PORT ?? String(DEFAULT_PORT), 10);
  serve({ fetch: app.fetch, port }, (info) => {
    console.log(`AEP API listening on http://localhost:${info.port}`);
    console.log("POST /resolve, POST /resolve/premium - intent JSON body, ?indexPath= optional");
    console.log("POST /probe, POST /probe/batch - on-demand x402 endpoint probe");
    console.log(
      "GET /analytics/account/:address, /analytics/credit-score/:address, /analytics/recommendations/:address"
    );
    console.log(
      "GET /analytics/pro/* (Analytics Pro, requires AEP_ANALYTICS_PRO_API_KEY when set)"
    );
    console.log(
      "GET /fleet/:id/summary, /fleet/:id/accounts, /fleet/:id/alerts (Fleet, requires AEP_FLEET_API_KEY when set)"
    );
    console.log("POST /graphql - GraphQL API for analytics");
  });
}

app.get("/health", (c) => c.json({ status: "ok" }));

app.post("/probe", async (c) => {
  try {
    const body = (await c.req.json()) as { url?: string; agentId?: number };
    const ip = (c.req.query("indexPath") ?? startupConfig.indexPath ?? DEFAULT_INDEX_PATH) as string;
    if (rejectPathTraversal(ip)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    if (!body.url && body.agentId == null) {
      return c.json({ error: "Provide url or agentId" }, 400);
    }
    if (body.url && body.agentId != null) {
      return c.json({ error: "Provide url or agentId, not both" }, 400);
    }
    let targetUrl: string;
    if (body.url) {
      if (!isValidProbeUrl(body.url, allowPrivateProbe)) {
        return c.json({ error: "Invalid URL (use http/https; set AEP_PROBE_ALLOW_PRIVATE=false to reject private IPs)" }, 400);
      }
      targetUrl = body.url;
    } else {
      const providers = loadProviders(ip);
      const id = BigInt(body.agentId!);
      const provider = providers.find((p) => p.agentId === id);
      if (!provider) {
        return c.json({ error: `Agent ${body.agentId} not found in index` }, 404);
      }
      const httpEndpoint = provider.services.find(
        (s) =>
          (s.name === "web" || s.name === "MCP" || s.name === "OASF") &&
          (s.endpoint.startsWith("http://") || s.endpoint.startsWith("https://"))
      )?.endpoint;
      if (!httpEndpoint) {
        return c.json({ error: `No HTTP endpoint for agent ${body.agentId}` }, 404);
      }
      targetUrl = httpEndpoint;
    }
    const result = await probeX402Endpoint(targetUrl);
    return c.json({
      success: result.success,
      price: result.price?.toString(),
      latencyMs: result.latencyMs,
      paymentTo: result.paymentTo,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.post("/probe/batch", async (c) => {
  try {
    const body = (await c.req.json()) as { urls?: string[]; agentIds?: number[] };
    const ip = (c.req.query("indexPath") ?? startupConfig.indexPath ?? DEFAULT_INDEX_PATH) as string;
    if (rejectPathTraversal(ip)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const urls = body.urls ?? [];
    const agentIds = body.agentIds ?? [];
    if (urls.length === 0 && agentIds.length === 0) {
      return c.json({ error: "Provide urls or agentIds" }, 400);
    }
    if (urls.length + agentIds.length > PROBE_BATCH_MAX) {
      return c.json({ error: `Batch size exceeds limit (max ${PROBE_BATCH_MAX} urls + agentIds combined)` }, 400);
    }
    for (const url of urls) {
      if (!isValidProbeUrl(url, allowPrivateProbe)) {
        return c.json({ error: "Invalid URL in urls (use http/https; set AEP_PROBE_ALLOW_PRIVATE=false to reject private IPs)" }, 400);
      }
    }
    const providers = loadProviders(ip);
    const targets: string[] = [...urls];
    for (const id of agentIds) {
      const provider = providers.find((p) => p.agentId === BigInt(id));
      const httpEndpoint = provider?.services.find(
        (s) =>
          (s.name === "web" || s.name === "MCP" || s.name === "OASF") &&
          (s.endpoint.startsWith("http://") || s.endpoint.startsWith("https://"))
      )?.endpoint;
      if (httpEndpoint) targets.push(httpEndpoint);
    }
    const results = await Promise.all(targets.map((url) => probeX402Endpoint(url)));
    return c.json(
      results.map((r) => ({
        success: r.success,
        price: r.price?.toString(),
        latencyMs: r.latencyMs,
        paymentTo: r.paymentTo,
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

async function resolveHandler(c: Context) {
  const body = await c.req.json();
  const intent = parseIntent(body);
  const indexPath = (c.req.query("indexPath") ?? startupConfig.indexPath ?? DEFAULT_INDEX_PATH) as string;
  const accountAddress = c.req.query("accountAddress") as string | undefined;
  const graphPath = (c.req.query("graphPath") ?? startupConfig.graphPath ?? DEFAULT_GRAPH_PATH) as string;
  if (rejectPathTraversal(indexPath) || (graphPath && rejectPathTraversal(graphPath))) {
    return c.json({ error: "Invalid path" }, 400);
  }
  const plan = await resolveIntent(intent, {
    indexPath,
    accountAddress: accountAddress && isAddress(accountAddress) ? (accountAddress as `0x${string}`) : undefined,
    graphPath,
  });
  return c.json(plan);
}

app.post("/resolve", async (c) => {
  try {
    return await resolveHandler(c);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.post("/resolve/premium", async (c) => {
  try {
    return await resolveHandler(c);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

const graphPath = startupConfig.graphPath ?? DEFAULT_GRAPH_PATH;
const indexPath = startupConfig.indexPath ?? DEFAULT_INDEX_PATH;

app.get("/analytics/account/:address", async (c) => {
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const analytics = getAccountAnalytics(gp, address);
    return c.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/analytics/credit-score/:address", async (c) => {
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const result = computeCreditScore(gp, address);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

const analyticsProApiKey = process.env.AEP_ANALYTICS_PRO_API_KEY;

function requireAnalyticsProAuth(c: Context): Response | null {
  if (!analyticsProApiKey) return null;
  const auth = c.req.header("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const headerKey = c.req.header("X-Analytics-Pro-API-Key");
  const key = bearer ?? headerKey;
  if (!key || key !== analyticsProApiKey) {
    return c.json({ error: "Unauthorized: Analytics Pro API key required" }, 401);
  }
  return null;
}

app.get("/analytics/pro/account/:address", async (c) => {
  const authErr = requireAnalyticsProAuth(c);
  if (authErr) return authErr;
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    const period = (c.req.query("period") ?? "30d") as string;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const range = getBlockRangeForPeriod(gp, period);
    const analytics = range
      ? getAccountAnalyticsInRange(gp, address, range.fromBlock, range.toBlock)
      : getAccountAnalytics(gp, address);
    return c.json(analytics);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/analytics/pro/credit-score/:address", async (c) => {
  const authErr = requireAnalyticsProAuth(c);
  if (authErr) return authErr;
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    const period = (c.req.query("period") ?? "30d") as string;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const range = getBlockRangeForPeriod(gp, period);
    const result = range
      ? computeCreditScoreInRange(gp, address, range.fromBlock, range.toBlock)
      : computeCreditScore(gp, address);
    return c.json(result);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/analytics/pro/export/:address", async (c) => {
  const authErr = requireAnalyticsProAuth(c);
  if (authErr) return authErr;
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    const period = (c.req.query("period") ?? "30d") as string;
    const format = c.req.query("format") ?? "csv";
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    if (format !== "csv") {
      return c.json({ error: "Only format=csv supported" }, 400);
    }
    const range = getBlockRangeForPeriod(gp, period);
    const csv = range
      ? exportPaymentsCsv(gp, address, range.fromBlock, range.toBlock)
      : exportPaymentsCsv(gp, address);
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="payments-${address.slice(0, 10)}.csv"`,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/analytics/pro/trends/:address", async (c) => {
  const authErr = requireAnalyticsProAuth(c);
  if (authErr) return authErr;
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    const period = (c.req.query("period") ?? "30d") as "7d" | "30d" | "90d";
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const trends = getPaymentTrends(gp, address, period);
    return c.json(trends);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

const fleetApiKey = process.env.AEP_FLEET_API_KEY;

function requireFleetAuth(c: Context): Response | null {
  if (!fleetApiKey) return null;
  const auth = c.req.header("Authorization");
  const bearer = auth?.startsWith("Bearer ") ? auth.slice(7) : null;
  const headerKey = c.req.header("X-Fleet-API-Key");
  const key = bearer ?? headerKey;
  if (!key || key !== fleetApiKey) {
    return c.json({ error: "Unauthorized: Fleet API key required" }, 401);
  }
  return null;
}

app.get("/fleet/:id/summary", async (c) => {
  const authErr = requireFleetAuth(c);
  if (authErr) return authErr;
  try {
    const id = c.req.param("id");
    const fleets = startupConfig.fleets ?? {};
    const fleet = fleets[id];
    if (!fleet || !fleet.accounts?.length) {
      return c.json({ error: `Fleet ${id} not found` }, 404);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const summary = getFleetSummary(gp, fleet.accounts);
    return c.json(summary);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/fleet/:id/accounts", async (c) => {
  const authErr = requireFleetAuth(c);
  if (authErr) return authErr;
  try {
    const id = c.req.param("id");
    const fleets = startupConfig.fleets ?? {};
    const fleet = fleets[id];
    if (!fleet || !fleet.accounts?.length) {
      return c.json({ error: `Fleet ${id} not found` }, 404);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const summary = getFleetSummary(gp, fleet.accounts);
    return c.json({ accounts: summary.accounts, name: fleet.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/fleet/:id/alerts", async (c) => {
  const authErr = requireFleetAuth(c);
  if (authErr) return authErr;
  try {
    const id = c.req.param("id");
    const fleets = startupConfig.fleets ?? {};
    const fleet = fleets[id];
    if (!fleet || !fleet.accounts?.length) {
      return c.json({ error: `Fleet ${id} not found` }, 404);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    const rpc = process.env.AEP_RPC_URL ?? startupConfig.rpcUrl ?? DEFAULT_RPC;
    if (rejectPathTraversal(gp)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const fromBlockRaw = c.req.query("fromBlock");
    const toBlockRaw = c.req.query("toBlock");
    const chainId =
      startupConfig.chainId ??
      parseInt(process.env.AEP_CHAIN_ID ?? process.env.BASE_SEPOLIA_CHAIN_ID ?? "84532", 10);
    const options: {
      fromBlock?: number;
      toBlock?: number;
      entryPointAddress?: `0x${string}`;
      chainId?: number;
    } = {
      entryPointAddress: DEFAULT_ENTRYPOINT,
      chainId,
    };
    if (fromBlockRaw) {
      const n = parseInt(fromBlockRaw, 10);
      if (!Number.isNaN(n) && n >= 0) options.fromBlock = n;
    }
    if (toBlockRaw) {
      const n = parseInt(toBlockRaw, 10);
      if (!Number.isNaN(n) && n >= 0) options.toBlock = n;
    }
    const alerts = await getFleetAlerts(gp, rpc, fleet.accounts, options);
    return c.json({ alerts });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

app.get("/analytics/recommendations/:address", async (c) => {
  try {
    const address = c.req.param("address");
    if (!isAddress(address)) {
      return c.json({ error: "Invalid address" }, 400);
    }
    const gp = (c.req.query("graphPath") ?? graphPath) as string;
    const ip = (c.req.query("indexPath") ?? indexPath) as string;
    if (rejectPathTraversal(gp) || rejectPathTraversal(ip)) {
      return c.json({ error: "Invalid path" }, 400);
    }
    const capability = c.req.query("capability");
    const limitRaw = parseInt(c.req.query("limit") ?? "5", 10);
    const limit = Number.isNaN(limitRaw) || limitRaw < 1 ? 5 : Math.min(limitRaw, 50);
    const providers = loadProviders(ip);
    const recs = getRecommendations(gp, providers, address, capability, limit);
    return c.json(
      recs.map((r) => ({
        ...r,
        agentId: r.agentId.toString(),
      }))
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return c.json({ error: message }, 400);
  }
});

const graphqlSchema = buildSchema(`
  type AccountAnalytics {
    address: String!
    totalOutflow: String!
    totalInflow: String!
    netPnl: String!
    paymentCount: Int!
    uniqueCounterparties: Int!
    creditDraws: Int!
    creditRepays: Int!
    defaults: Int!
    slaBreaches: Int!
    successRate: Float!
  }
  type CreditScoreFactors {
    paymentConsistency: Float!
    revenueStability: Float!
    relationshipStability: Float!
    defaultHistory: Float!
    slaBreachHistory: Float!
  }
  type CreditScoreResult {
    score: Float!
    factors: CreditScoreFactors!
  }
  type ProviderRecommendation {
    agentId: String!
    paymentWallet: String!
    name: String
    description: String
    score: Float!
    paymentCount: Int!
  }
  type Query {
    accountAnalytics(address: String!, graphPath: String): AccountAnalytics
    creditScore(address: String!, graphPath: String): CreditScoreResult!
    recommendations(address: String!, graphPath: String, indexPath: String, capability: String, limit: Int): [ProviderRecommendation!]!
  }
`);

app.use(
  "/graphql",
  graphqlServer({
    schema: graphqlSchema,
    rootResolver: (c) => ({
      accountAnalytics: (
        _parent: unknown,
        args: { address: string; graphPath?: string }
      ) => {
        if (!isAddress(args.address)) throw new Error("Invalid address");
        const gp = args.graphPath ?? graphPath;
        if (rejectPathTraversal(gp)) throw new Error("Invalid path");
        return getAccountAnalytics(gp, args.address);
      },
      creditScore: (
        _parent: unknown,
        args: { address: string; graphPath?: string }
      ) => {
        if (!isAddress(args.address)) throw new Error("Invalid address");
        const gp = args.graphPath ?? graphPath;
        if (rejectPathTraversal(gp)) throw new Error("Invalid path");
        return computeCreditScore(gp, args.address);
      },
      recommendations: (
        _parent: unknown,
        args: {
          address: string;
          graphPath?: string;
          indexPath?: string;
          capability?: string;
          limit?: number;
        }
      ) => {
        if (!isAddress(args.address)) throw new Error("Invalid address");
        const gp = args.graphPath ?? graphPath;
        const ip = args.indexPath ?? indexPath;
        if (rejectPathTraversal(gp) || rejectPathTraversal(ip)) {
          throw new Error("Invalid path");
        }
        const providers = loadProviders(ip);
        return getRecommendations(
          gp,
          providers,
          args.address,
          args.capability,
          args.limit ?? 5
        ).map((r) => ({ ...r, agentId: r.agentId.toString() }));
      },
    }),
    graphiql: true,
  })
);

configurePaywallAndStart();
