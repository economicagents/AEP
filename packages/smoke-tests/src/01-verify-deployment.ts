/**
 * Read-only validation: verify all deployed Base Sepolia contracts exist.
 * Exit 0 if all pass, 1 if any fail.
 */
import { createPublicClient, http } from "viem";
import { baseSepolia } from "@economicagents/sdk";
import { BASE_SEPOLIA_ADDRESSES } from "./addresses.js";
import { loadConfig } from "./config.js";

const CONTRACTS = [
  { name: "AEPAccount implementation", address: BASE_SEPOLIA_ADDRESSES.aepAccountImpl },
  { name: "AEPAccountFactory", address: BASE_SEPOLIA_ADDRESSES.aepAccountFactory },
  { name: "CreditFacilityFactory", address: BASE_SEPOLIA_ADDRESSES.creditFacilityFactory },
  { name: "ConditionalEscrowFactory", address: BASE_SEPOLIA_ADDRESSES.conditionalEscrowFactory },
  { name: "RevenueSplitterFactory", address: BASE_SEPOLIA_ADDRESSES.revenueSplitterFactory },
  { name: "SLAContractFactory", address: BASE_SEPOLIA_ADDRESSES.slaContractFactory },
  { name: "First AEP account", address: BASE_SEPOLIA_ADDRESSES.firstAepAccount },
  { name: "IdentityRegistry", address: BASE_SEPOLIA_ADDRESSES.identityRegistry },
  { name: "ReputationRegistry", address: BASE_SEPOLIA_ADDRESSES.reputationRegistry },
  { name: "ValidationRegistry", address: BASE_SEPOLIA_ADDRESSES.validationRegistry },
  { name: "USDC", address: BASE_SEPOLIA_ADDRESSES.usdc },
  { name: "EntryPoint", address: BASE_SEPOLIA_ADDRESSES.entryPoint },
] as const;

async function main(): Promise<number> {
  const config = loadConfig();
  const client = createPublicClient({
    chain: baseSepolia,
    transport: http(config.rpcUrl),
  });

  let failed = 0;
  for (const { name, address } of CONTRACTS) {
    try {
      const code = await client.getBytecode({ address });
      if (!code || code === "0x" || code.length < 4) {
        console.error(`FAIL: ${name} at ${address} — no bytecode`);
        failed++;
      } else {
        console.log(`OK: ${name} at ${address}`);
      }
    } catch (err) {
      console.error(`FAIL: ${name} at ${address} — ${(err as Error).message}`);
      failed++;
    }
  }

  // Verify factory returns correct account for known owner/salt
  try {
    const expected = BASE_SEPOLIA_ADDRESSES.firstAepAccount;
    const owner = "0xdEc6bDb019BdEaA0591170313D8316F25B29D139" as `0x${string}`;
    const salt = `0x${"0".repeat(64)}` as `0x${string}`;
    const actual = await client.readContract({
      address: BASE_SEPOLIA_ADDRESSES.aepAccountFactory,
      abi: [
        {
          inputs: [
            { name: "owner", type: "address" },
            { name: "salt", type: "bytes32" },
          ],
          name: "getAccountAddress",
          outputs: [{ name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "getAccountAddress",
      args: [owner, salt],
    });
    if (actual.toLowerCase() === expected.toLowerCase()) {
      console.log("OK: AEPAccountFactory.getAccountAddress matches first account");
    } else {
      console.error(`FAIL: getAccountAddress(owner, salt) = ${actual}, expected ${expected}`);
      failed++;
    }
  } catch (err) {
    console.error(`FAIL: AEPAccountFactory.getAccountAddress — ${(err as Error).message}`);
    failed++;
  }

  if (failed > 0) {
    console.error(`\n${failed} verification(s) failed`);
    return 1;
  }
  console.log("\nAll verifications passed");
  return 0;
}

main()
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
