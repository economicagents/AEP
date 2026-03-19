/**
 * Keystore signer resolver tests.
 * Uses a well-known test-only private key (Foundry/Anvil default #0).
 * NEVER use this key for real funds — it is published in Foundry docs.
 */
import { mkdtempSync, rmSync, writeFileSync } from "fs";
import { join } from "path";
import { tmpdir } from "os";
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { Wallet } from "ethers";
import { getSignerAccount, getSignerAccountSync } from "../src/index.js";

// Foundry/Anvil default test key #0 — published, test-only, never for real funds
const TEST_PRIVATE_KEY = "0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80" as const;
const EXPECTED_ADDRESS = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266" as const;
const KEYSTORE_PASSWORD = "test-password";

const envKeys = [
  "AEP_KEYSTORE_PATH",
  "AEP_KEYSTORE_ACCOUNT",
  "AEP_KEYSTORE_PASSWORD",
  "FOUNDRY_PASSWORD",
  "FOUNDRY_KEYSTORE_DIR",
  "FOUNDRY_ACCOUNT",
  "PRIVATE_KEY",
  "AEP_SILENCE_PRIVATE_KEY_WARNING",
] as const;

function saveEnv(): Record<string, string | undefined> {
  const saved: Record<string, string | undefined> = {};
  for (const k of envKeys) {
    saved[k] = process.env[k];
  }
  return saved;
}

function restoreEnv(saved: Record<string, string | undefined>): void {
  for (const k of envKeys) {
    if (saved[k] !== undefined) {
      process.env[k] = saved[k];
    } else {
      delete process.env[k];
    }
  }
}

describe("keystore", () => {
  let tmpDir: string;
  let savedEnv: Record<string, string | undefined>;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), "aep-keystore-test-"));
    savedEnv = saveEnv();
  });

  afterEach(() => {
    restoreEnv(savedEnv);
    rmSync(tmpDir, { recursive: true, force: true });
  });

  async function createTestKeystore(filename = "test-account.json"): Promise<string> {
    const wallet = new Wallet(TEST_PRIVATE_KEY);
    const encrypted = await wallet.encrypt(KEYSTORE_PASSWORD);
    const path = join(tmpDir, filename);
    writeFileSync(path, encrypted, "utf-8");
    return path;
  }

  describe("getSignerAccount (async)", () => {
    it("resolves from keystore via AEP_KEYSTORE_PATH", async () => {
      const keystorePath = await createTestKeystore();
      process.env.AEP_KEYSTORE_PATH = keystorePath;
      process.env.AEP_KEYSTORE_PASSWORD = KEYSTORE_PASSWORD;
      delete process.env.PRIVATE_KEY;

      const { account, privateKey } = await getSignerAccount();

      expect(account.address).toBe(EXPECTED_ADDRESS);
      expect(privateKey).toBe(TEST_PRIVATE_KEY);
    });

    it("resolves from keystore via FOUNDRY_KEYSTORE_DIR + account name", async () => {
      await createTestKeystore("foundry.json");
      process.env.FOUNDRY_KEYSTORE_DIR = tmpDir;
      process.env.AEP_KEYSTORE_ACCOUNT = "foundry";
      process.env.AEP_KEYSTORE_PASSWORD = KEYSTORE_PASSWORD;
      delete process.env.PRIVATE_KEY;
      delete process.env.AEP_KEYSTORE_PATH;

      const { account } = await getSignerAccount();

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });

    it("prefers keystore over PRIVATE_KEY when both are set", async () => {
      const keystorePath = await createTestKeystore();
      process.env.AEP_KEYSTORE_PATH = keystorePath;
      process.env.AEP_KEYSTORE_PASSWORD = KEYSTORE_PASSWORD;
      process.env.PRIVATE_KEY = "0x0000000000000000000000000000000000000000000000000000000000000001";

      const { account } = await getSignerAccount();

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });

    it("falls back to PRIVATE_KEY when no keystore", async () => {
      process.env.PRIVATE_KEY = TEST_PRIVATE_KEY;
      process.env.AEP_SILENCE_PRIVATE_KEY_WARNING = "1";
      delete process.env.AEP_KEYSTORE_PATH;
      delete process.env.FOUNDRY_KEYSTORE_DIR;

      const { account } = await getSignerAccount();

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });

    it("accepts account name override", async () => {
      await createTestKeystore("custom.json");
      process.env.FOUNDRY_KEYSTORE_DIR = tmpDir;
      process.env.AEP_KEYSTORE_PASSWORD = KEYSTORE_PASSWORD;
      delete process.env.AEP_KEYSTORE_ACCOUNT;
      delete process.env.AEP_KEYSTORE_PATH;

      const { account } = await getSignerAccount("custom");

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });

    it("throws on wrong password and never leaks key in error", async () => {
      const keystorePath = await createTestKeystore();
      process.env.AEP_KEYSTORE_PATH = keystorePath;
      process.env.AEP_KEYSTORE_PASSWORD = "wrong-password";
      delete process.env.PRIVATE_KEY;

      const err = await getSignerAccount().catch((e) => e);
      expect(err).toBeInstanceOf(Error);
      expect(String(err)).not.toContain(TEST_PRIVATE_KEY);
    });

    it("throws when no signer available", async () => {
      delete process.env.PRIVATE_KEY;
      delete process.env.AEP_KEYSTORE_PATH;
      delete process.env.FOUNDRY_KEYSTORE_DIR;
      process.env.FOUNDRY_KEYSTORE_DIR = join(tmpDir, "nonexistent");

      await expect(getSignerAccount()).rejects.toThrow("No signer");
    });

    it("accepts PRIVATE_KEY without 0x prefix", async () => {
      process.env.PRIVATE_KEY = TEST_PRIVATE_KEY.slice(2);
      process.env.AEP_SILENCE_PRIVATE_KEY_WARNING = "1";
      delete process.env.AEP_KEYSTORE_PATH;

      const { account } = await getSignerAccount();

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });
  });

  describe("getSignerAccountSync", () => {
    it("resolves from keystore when password in env", async () => {
      const keystorePath = await createTestKeystore();
      process.env.AEP_KEYSTORE_PATH = keystorePath;
      process.env.AEP_KEYSTORE_PASSWORD = KEYSTORE_PASSWORD;
      delete process.env.PRIVATE_KEY;

      const { account } = getSignerAccountSync();

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });

    it("falls back to PRIVATE_KEY when no keystore", () => {
      process.env.PRIVATE_KEY = TEST_PRIVATE_KEY;
      process.env.AEP_SILENCE_PRIVATE_KEY_WARNING = "1";
      delete process.env.AEP_KEYSTORE_PATH;

      const { account } = getSignerAccountSync();

      expect(account.address).toBe(EXPECTED_ADDRESS);
    });

    it("throws when keystore exists but no password in env", async () => {
      const keystorePath = await createTestKeystore();
      process.env.AEP_KEYSTORE_PATH = keystorePath;
      delete process.env.AEP_KEYSTORE_PASSWORD;
      delete process.env.FOUNDRY_PASSWORD;
      delete process.env.PRIVATE_KEY;

      expect(() => getSignerAccountSync()).toThrow("Keystore password required");
    });

    it("throws when no signer available", () => {
      delete process.env.PRIVATE_KEY;
      delete process.env.AEP_KEYSTORE_PATH;
      process.env.FOUNDRY_KEYSTORE_DIR = join(tmpDir, "nonexistent");

      expect(() => getSignerAccountSync()).toThrow("No signer");
    });
  });
});
