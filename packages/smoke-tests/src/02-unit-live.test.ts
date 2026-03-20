/**
 * Unit tests against live Base Sepolia contracts (read-only).
 * Skip when BASE_SEPOLIA_RPC not set or SKIP_LIVE_TESTS=1.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  getAccountAddress,
  getDeposit,
  getPolicyModules,
  getBudgetPolicyState,
  checkPolicy,
  checkPolicyDetailed,
} from "@economicagents/sdk";
import { BASE_SEPOLIA_ADDRESSES } from "./addresses.js";
import { loadConfig } from "./config.js";

const config = loadConfig();
const skip =
  !process.env.BASE_SEPOLIA_RPC || config.skipLiveTests ? "BASE_SEPOLIA_RPC not set or SKIP_LIVE_TESTS=1" : false;

describe("02-unit-live (Base Sepolia read-only)", () => {
  beforeAll(() => {
    if (skip) return;
  });

  it(
    "getAccountAddress returns correct address for known owner/salt",
    async () => {
      if (skip) return;
      const owner = "0xdEc6bDb019BdEaA0591170313D8316F25B29D139" as `0x${string}`;
      const salt = `0x${"0".repeat(64)}` as `0x${string}`;
      const addr = await getAccountAddress(owner, salt, {
        factoryAddress: BASE_SEPOLIA_ADDRESSES.aepAccountFactory,
        rpcUrl: config.rpcUrl,
      });
      expect(addr.toLowerCase()).toBe(BASE_SEPOLIA_ADDRESSES.firstAepAccount.toLowerCase());
    },
    { skip: !!skip }
  );

  it(
    "getDeposit returns value for first account",
    async () => {
      if (skip) return;
      const deposit = await getDeposit(BASE_SEPOLIA_ADDRESSES.firstAepAccount, {
        rpcUrl: config.rpcUrl,
      });
      expect(typeof deposit).toBe("bigint");
      expect(deposit >= 0n).toBe(true);
    },
    { skip: !!skip }
  );

  it(
    "getPolicyModules returns array for first account",
    async () => {
      if (skip) return;
      const modules = await getPolicyModules(BASE_SEPOLIA_ADDRESSES.firstAepAccount, {
        rpcUrl: config.rpcUrl,
      });
      expect(Array.isArray(modules)).toBe(true);
      // First account may have 0 or more policy modules
      for (const m of modules) {
        expect(typeof m).toBe("string");
        expect(m.length).toBe(42);
      }
    },
    { skip: !!skip }
  );

  it(
    "getBudgetPolicyState works when policy module exists",
    async () => {
      if (skip) return;
      const modules = await getPolicyModules(BASE_SEPOLIA_ADDRESSES.firstAepAccount, {
        rpcUrl: config.rpcUrl,
      });
      if (modules.length === 0) return;
      const state = await getBudgetPolicyState(modules[0] as `0x${string}`, {
        rpcUrl: config.rpcUrl,
      });
      expect(state).toBeDefined();
      expect(typeof state.maxPerTx).toBe("bigint");
      expect(typeof state.maxDaily).toBe("bigint");
      expect(typeof state.spentDaily).toBe("bigint");
    },
    { skip: !!skip }
  );

  it(
    "checkPolicy returns boolean for first account",
    async () => {
      if (skip) return;
      const result = await checkPolicy(
        BASE_SEPOLIA_ADDRESSES.firstAepAccount,
        1n,
        BASE_SEPOLIA_ADDRESSES.usdc,
        { rpcUrl: config.rpcUrl }
      );
      expect(typeof result).toBe("boolean");
    },
    { skip: !!skip }
  );

  it(
    "checkPolicyDetailed returns PolicyCheckResult for first account",
    async () => {
      if (skip) return;
      const result = await checkPolicyDetailed(
        BASE_SEPOLIA_ADDRESSES.firstAepAccount,
        1n,
        BASE_SEPOLIA_ADDRESSES.usdc,
        { rpcUrl: config.rpcUrl }
      );
      expect(result).toBeDefined();
      expect(typeof result.allowed).toBe("boolean");
      if (!result.allowed) {
        expect(["BUDGET_EXCEEDED", "COUNTERPARTY_BLOCKED", "REPUTATION_TOO_LOW", "RATE_LIMIT", "UNKNOWN"]).toContain(
          result.reason
        );
      }
    },
    { skip: !!skip }
  );
});
