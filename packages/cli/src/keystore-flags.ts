/**
 * Foundry keystore account name resolution with deprecation for overloaded -a/--account.
 */

let keystoreAccountDeprecationEmitted = false;

/** For deploy/address only: -n/--keystore-account is canonical; -a/--account is deprecated (keystore name). */
export function resolveKeystoreAccountName(
  opts: { account?: string; keystoreAccount?: string },
  commandLabel: string
): string | undefined {
  const legacy = opts.account?.trim() ? opts.account : undefined;
  const modern = opts.keystoreAccount?.trim() ? opts.keystoreAccount : undefined;
  if (legacy !== undefined && modern !== undefined && legacy !== modern) {
    console.error(
      "Error: use only one of --keystore-account (-n) or deprecated -a/--account for keystore name"
    );
    process.exit(1);
  }
  if (legacy !== undefined) {
    if (!keystoreAccountDeprecationEmitted) {
      console.error(
        `Warning: -a/--account for Foundry keystore name is deprecated (${commandLabel}); use -n/--keystore-account`
      );
      keystoreAccountDeprecationEmitted = true;
    }
    return legacy;
  }
  return modern;
}
