/**
 * Foundry keystore signer resolver for AEP.
 * Prefer keystore; fallback to PRIVATE_KEY with warning.
 */
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import { Wallet } from "ethers";
import { privateKeyToAccount, type PrivateKeyAccount } from "viem/accounts";

const DEFAULT_KEYSTORE_DIR = join(homedir(), ".foundry", "keystores");
const PRIVATE_KEY_WARNING =
  "Warning: PRIVATE_KEY in .env is insecure. Prefer: cast wallet import aep --interactive, then set AEP_KEYSTORE_ACCOUNT=aep";

let privateKeyWarningEmitted = false;

function resolveKeystorePath(accountName: string): string | null {
  const explicitPath = process.env.AEP_KEYSTORE_PATH;
  if (explicitPath && existsSync(explicitPath)) {
    return explicitPath;
  }
  const keystoreDir = process.env.FOUNDRY_KEYSTORE_DIR ?? DEFAULT_KEYSTORE_DIR;
  if (!existsSync(keystoreDir)) {
    return null;
  }
  const candidates = [
    join(keystoreDir, accountName),
    join(keystoreDir, `${accountName}.json`),
  ];
  for (const p of candidates) {
    if (existsSync(p)) {
      return p;
    }
  }
  const files = readdirSync(keystoreDir, { withFileTypes: true });
  for (const f of files) {
    if (f.isFile() && (f.name === accountName || f.name === `${accountName}.json`)) {
      return join(keystoreDir, f.name);
    }
  }
  return null;
}

async function getPassword(): Promise<string> {
  const pw =
    process.env.FOUNDRY_PASSWORD ??
    process.env.AEP_KEYSTORE_PASSWORD ??
    process.env.ETH_KEYSTORE_PASSWORD;
  if (pw) return pw;
  if (process.stdin.isTTY) {
    const readline = await import("readline");
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    return new Promise<string>((resolve) => {
      rl.question("Keystore password: ", (answer) => {
        rl.close();
        resolve(answer);
      });
    });
  }
  throw new Error(
    "Keystore password required. Set FOUNDRY_PASSWORD or AEP_KEYSTORE_PASSWORD, or run interactively."
  );
}

export type SignerResult = { account: PrivateKeyAccount; privateKey: `0x${string}` };

export async function getSignerAccount(accountNameOverride?: string): Promise<SignerResult> {
  const accountName =
    accountNameOverride ??
    process.env.AEP_KEYSTORE_ACCOUNT ??
    process.env.FOUNDRY_ACCOUNT ??
    "foundry";

  const keystorePath = resolveKeystorePath(accountName);
  if (keystorePath) {
    const json = readFileSync(keystorePath, "utf-8");
    const password = await getPassword();
    const wallet = Wallet.fromEncryptedJsonSync(json, password);
    const pk = (wallet.privateKey.startsWith("0x") ? wallet.privateKey : `0x${wallet.privateKey}`) as `0x${string}`;
    return { account: privateKeyToAccount(pk), privateKey: pk };
  }

  const rawPk = process.env.PRIVATE_KEY;
  if (rawPk) {
    if (!privateKeyWarningEmitted && process.env.AEP_SILENCE_PRIVATE_KEY_WARNING !== "1") {
      console.error(PRIVATE_KEY_WARNING);
      privateKeyWarningEmitted = true;
    }
    const pk = (rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`) as `0x${string}`;
    return { account: privateKeyToAccount(pk), privateKey: pk };
  }

  throw new Error(
    "No signer. Recommended: cast wallet import aep --interactive, then set AEP_KEYSTORE_ACCOUNT=aep. Fallback: set PRIVATE_KEY in .env (insecure)."
  );
}

export function getSignerAccountSync(accountNameOverride?: string): SignerResult {
  const accountName =
    accountNameOverride ??
    process.env.AEP_KEYSTORE_ACCOUNT ??
    process.env.FOUNDRY_ACCOUNT ??
    "foundry";

  const keystorePath = resolveKeystorePath(accountName);
  if (keystorePath) {
    const json = readFileSync(keystorePath, "utf-8");
    const password =
      process.env.FOUNDRY_PASSWORD ??
      process.env.AEP_KEYSTORE_PASSWORD ??
      process.env.ETH_KEYSTORE_PASSWORD;
    if (!password) {
      throw new Error(
        "Keystore password required. Set FOUNDRY_PASSWORD or AEP_KEYSTORE_PASSWORD for non-interactive use."
      );
    }
    const wallet = Wallet.fromEncryptedJsonSync(json, password);
    const pk = (wallet.privateKey.startsWith("0x") ? wallet.privateKey : `0x${wallet.privateKey}`) as `0x${string}`;
    return { account: privateKeyToAccount(pk), privateKey: pk };
  }

  const rawPk = process.env.PRIVATE_KEY;
  if (rawPk) {
    if (!privateKeyWarningEmitted && process.env.AEP_SILENCE_PRIVATE_KEY_WARNING !== "1") {
      console.error(PRIVATE_KEY_WARNING);
      privateKeyWarningEmitted = true;
    }
    const pk = (rawPk.startsWith("0x") ? rawPk : `0x${rawPk}`) as `0x${string}`;
    return { account: privateKeyToAccount(pk), privateKey: pk };
  }

  throw new Error(
    "No signer. Recommended: cast wallet import aep --interactive, then set AEP_KEYSTORE_ACCOUNT=aep. Fallback: set PRIVATE_KEY in .env (insecure)."
  );
}
