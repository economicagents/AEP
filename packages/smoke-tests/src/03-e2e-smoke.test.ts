/**
 * E2E smoke tests (write operations) against Base Sepolia.
 * Requires AEP_KEYSTORE_ACCOUNT or PRIVATE_KEY with Base Sepolia ETH + USDC. Skip when SKIP_E2E=1.
 * Execute flow requires BUNDLER_RPC_URL.
 */
import { describe, it, expect, beforeAll } from "vitest";
import {
  createAccount,
  getAccountAddress,
  baseSepolia,
  getPolicyModules,
  checkPolicy,
  checkPolicyDetailed,
  execute,
  createCreditFacility,
  creditDeposit,
  creditDraw,
  creditRepay,
  getCreditFacilityState,
  createEscrow,
  escrowFund,
  escrowAcknowledge,
  escrowSubmitForValidation,
  getEscrowState,
  createRevenueSplitter,
  splitterDistribute,
  getRevenueSplitterState,
  createSLA,
  slaStake,
  getSLAState,
} from "@aep/sdk";
import { BASE_SEPOLIA_ADDRESSES } from "./addresses.js";
import { loadConfig, resolveSigner } from "./config.js";

const config = loadConfig();
let skipE2e = config.skipE2e;
let skipExecute = skipE2e || !config.bundlerRpcUrl;
let signer: { privateKey: `0x${string}`; walletAddress: `0x${string}` } | undefined;
let walletAddr: `0x${string}` | undefined;
const MIN_USDC = 20n * 10n ** 6n;
let hasEnoughUsdc = false;

function pk(): `0x${string}` {
  if (!signer) throw new Error("No signer (AEP_KEYSTORE_ACCOUNT or PRIVATE_KEY required for E2E)");
  return signer.privateKey;
}

function salt(): `0x${string}` {
  const hex = (Date.now() * 1000 + Math.floor(Math.random() * 1000)).toString(16).padStart(64, "0");
  return `0x${hex}` as `0x${string}`;
}

async function approveUsdc(spender: `0x${string}`, amount: bigint) {
  const { createWalletClient, createPublicClient, http } = await import("viem");
  const { privateKeyToAccount } = await import("viem/accounts");
  const account = privateKeyToAccount(pk());
  const transport = http(config.rpcUrl);
  const client = createWalletClient({
    account,
    chain: baseSepolia,
    transport,
  });
  const hash = await client!.writeContract({
    address: BASE_SEPOLIA_ADDRESSES.usdc,
    abi: [{ inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }], name: "approve", outputs: [{ type: "bool" }], stateMutability: "nonpayable", type: "function" }],
    functionName: "approve",
    args: [spender, amount],
  });
  const publicClient = createPublicClient({ chain: baseSepolia, transport });
  await publicClient.waitForTransactionReceipt({ hash });
}

describe("03-e2e-smoke (Base Sepolia write)", () => {
  beforeAll(async () => {
    signer = await resolveSigner();
    if (!signer) {
      skipE2e = true;
      skipExecute = true;
      return;
    }
    walletAddr = signer.walletAddress;
    if (skipE2e) return;
    try {
      const { createPublicClient, http } = await import("viem");
      const owner = walletAddr;
      const client = createPublicClient({
        chain: baseSepolia,
        transport: http(config.rpcUrl),
      });
      const balance = await client.readContract({
        address: BASE_SEPOLIA_ADDRESSES.usdc,
        abi: [{ inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
        functionName: "balanceOf",
        args: [owner],
      });
      hasEnoughUsdc = balance >= MIN_USDC;
    } catch {
      hasEnoughUsdc = false;
    }
  });

  it(
    "deploy new AEP account via factory",
    async () => {
      if (skipE2e) return;
      const owner = walletAddr!;
      const s = salt();
      const { account, txHash } = await createAccount({
        owner,
        salt: s,
        factoryAddress: BASE_SEPOLIA_ADDRESSES.aepAccountFactory,
        rpcUrl: config.rpcUrl,
        entryPointAddress: BASE_SEPOLIA_ADDRESSES.entryPoint,
        chain: baseSepolia,
        privateKey: pk(),
      });
      expect(txHash).toBeDefined();
      expect(account).toBeDefined();
      const predicted = await getAccountAddress(owner, s, {
        factoryAddress: BASE_SEPOLIA_ADDRESSES.aepAccountFactory,
        rpcUrl: config.rpcUrl,
      });
      expect(account.toLowerCase()).toBe(predicted.toLowerCase());
    },
    { skip: skipE2e }
  );

  it(
    "policy flow: checkPolicy and checkPolicyDetailed return valid results",
    async () => {
      if (skipE2e) return;
      const account = BASE_SEPOLIA_ADDRESSES.firstAepAccount;
      const modules = await getPolicyModules(account, { rpcUrl: config.rpcUrl });
      if (modules.length === 0) return;
      const recipient = BASE_SEPOLIA_ADDRESSES.usdc;
      const amount = 1n;
      const allowed = await checkPolicy(account, amount, recipient, { rpcUrl: config.rpcUrl });
      expect(typeof allowed).toBe("boolean");
      const detailed = await checkPolicyDetailed(account, amount, recipient, { rpcUrl: config.rpcUrl });
      expect(detailed).toBeDefined();
      expect(typeof detailed.allowed).toBe("boolean");
      if (!detailed.allowed && detailed.reason) {
        const validReasons = ["BUDGET_EXCEEDED", "COUNTERPARTY_BLOCKED", "REPUTATION_TOO_LOW", "RATE_LIMIT", "UNKNOWN"];
        expect(validReasons).toContain(detailed.reason);
      }
    },
    { skip: skipE2e }
  );

  it(
    "execute UserOp via bundler (sends ETH)",
    async () => {
      if (skipExecute) return;
      const owner = walletAddr!;
      const s = salt();
      const { account } = await createAccount({
        owner,
        salt: s,
        factoryAddress: BASE_SEPOLIA_ADDRESSES.aepAccountFactory,
        rpcUrl: config.rpcUrl,
        entryPointAddress: BASE_SEPOLIA_ADDRESSES.entryPoint,
        chain: baseSepolia,
        privateKey: pk(),
      });
      const recipient = "0x0000000000000000000000000000000000000001" as `0x${string}`;
      const hash = await execute(
        [{ to: recipient, value: 1n, data: "0x" }],
        {
          account,
          privateKey: pk(),
          rpcUrl: config.rpcUrl,
          bundlerRpcUrl: config.bundlerRpcUrl!,
          entryPointAddress: BASE_SEPOLIA_ADDRESSES.entryPoint,
        }
      );
      expect(hash).toBeDefined();
      expect(typeof hash).toBe("string");
      expect(hash.length).toBe(66);
    },
    { skip: skipExecute }
  );

  it(
    "credit facility: create, deposit, draw, repay",
    async () => {
      if (skipE2e || !hasEnoughUsdc) return;
      const owner = walletAddr!;
      const limit = 1000n * 10n ** 6n;
      const { facility } = await createCreditFacility({
        lender: owner,
        borrower: owner,
        token: BASE_SEPOLIA_ADDRESSES.usdc,
        limit,
        minReputation: 0,
        repaymentInterval: 86400 * 7,
        reputationRegistry: BASE_SEPOLIA_ADDRESSES.reputationRegistry,
        identityRegistry: BASE_SEPOLIA_ADDRESSES.identityRegistry,
        borrowerAgentId: 1n,
        factoryAddress: BASE_SEPOLIA_ADDRESSES.creditFacilityFactory,
        rpcUrl: config.rpcUrl,
        privateKey: pk(),
      });
      const stateBefore = await getCreditFacilityState(facility, { rpcUrl: config.rpcUrl });
      expect(stateBefore.limit).toBe(limit);
      expect(stateBefore.balance).toBe(0n);
      await creditDeposit(facility, 500n * 10n ** 6n, { rpcUrl: config.rpcUrl, privateKey: pk() });
      const stateAfterDeposit = await getCreditFacilityState(facility, { rpcUrl: config.rpcUrl });
      expect(stateAfterDeposit.balance >= 500n * 10n ** 6n).toBe(true);
      await creditDraw(facility, 100n * 10n ** 6n, { rpcUrl: config.rpcUrl, privateKey: pk() });
      const stateAfterDraw = await getCreditFacilityState(facility, { rpcUrl: config.rpcUrl });
      expect(stateAfterDraw.drawn).toBe(100n * 10n ** 6n);
      await creditRepay(facility, 100n * 10n ** 6n, { rpcUrl: config.rpcUrl, privateKey: pk() });
      const stateAfterRepay = await getCreditFacilityState(facility, { rpcUrl: config.rpcUrl });
      expect(stateAfterRepay.drawn).toBe(0n);
    },
    { skip: skipE2e || !hasEnoughUsdc }
  );

  it(
    "conditional escrow: create, fund, validate, release",
    async () => {
      if (skipE2e || !hasEnoughUsdc) return;
      const owner = walletAddr!;
      const amount = 100n * 10n ** 6n;
      const { escrow } = await createEscrow({
        consumer: owner,
        provider: owner,
        providerAgentId: 1n,
        token: BASE_SEPOLIA_ADDRESSES.usdc,
        validationRegistry: BASE_SEPOLIA_ADDRESSES.validationRegistry,
        validatorAddress: owner,
        factoryAddress: BASE_SEPOLIA_ADDRESSES.conditionalEscrowFactory,
        rpcUrl: config.rpcUrl,
        privateKey: pk(),
      });
      await approveUsdc(escrow, amount);
      await escrowFund(escrow, amount, { rpcUrl: config.rpcUrl, privateKey: pk() });
      await escrowAcknowledge(escrow, { rpcUrl: config.rpcUrl, privateKey: pk() });
      const requestHash = "0x" + "00".repeat(32) as `0x${string}`;
      await escrowSubmitForValidation(escrow, requestHash, {
        rpcUrl: config.rpcUrl,
        privateKey: pk(),
        milestoneIndex: 0,
      });
      const state = await getEscrowState(escrow, { rpcUrl: config.rpcUrl });
      expect(state.state).toBe(2); // VALIDATING
    },
    { skip: skipE2e || !hasEnoughUsdc }
  );

  it(
    "revenue splitter: create and distribute",
    async () => {
      if (skipE2e || !hasEnoughUsdc) return;
      const owner = walletAddr!;
      const { splitter } = await createRevenueSplitter(
        {
          recipients: [owner, owner],
          weights: [5000, 5000],
          token: BASE_SEPOLIA_ADDRESSES.usdc,
          factoryAddress: BASE_SEPOLIA_ADDRESSES.revenueSplitterFactory,
          rpcUrl: config.rpcUrl,
          privateKey: pk(),
        }
      );
      const state = await getRevenueSplitterState(splitter, { rpcUrl: config.rpcUrl });
      expect(state.recipients.length).toBe(2);
      expect(state.weights.length).toBe(2);
      await splitterDistribute(splitter, { rpcUrl: config.rpcUrl, privateKey: pk() });
    },
    { skip: skipE2e || !hasEnoughUsdc }
  );

  it(
    "SLA: create and stake",
    async () => {
      if (skipE2e || !hasEnoughUsdc) return;
      const owner = walletAddr!;
      const stakeAmount = 10n * 10n ** 6n;
      const { sla } = await createSLA({
        provider: owner,
        consumer: owner,
        providerAgentId: 1n,
        stakeToken: BASE_SEPOLIA_ADDRESSES.usdc,
        stakeAmount,
        validationRegistry: BASE_SEPOLIA_ADDRESSES.validationRegistry,
        breachThreshold: 80,
        factoryAddress: BASE_SEPOLIA_ADDRESSES.slaContractFactory,
        rpcUrl: config.rpcUrl,
        privateKey: pk(),
      });
      await approveUsdc(sla, stakeAmount);
      await slaStake(sla, { rpcUrl: config.rpcUrl, privateKey: pk() });
      const state = await getSLAState(sla, { rpcUrl: config.rpcUrl });
      expect(state.staked).toBe(true);
      expect(state.balance >= stakeAmount).toBe(true);
    },
    { skip: skipE2e || !hasEnoughUsdc }
  );
});
