/**
 * Machine-readable vs human CLI output helpers.
 * `setGlobalJson` is set from Commander preAction via optsWithGlobals() so nested subcommands inherit --json.
 */

let globalJsonFromArgv = false;

export function setGlobalJson(enabled: boolean): void {
  globalJsonFromArgv = enabled;
}

export function wantsJson(opts: { json?: boolean }): boolean {
  return Boolean(opts.json || globalJsonFromArgv);
}

export function emitResult(
  opts: { json?: boolean },
  payload: Record<string, unknown>,
  humanLines: string[]
): void {
  if (wantsJson(opts)) {
    console.log(JSON.stringify(payload));
    return;
  }
  for (const line of humanLines) {
    console.log(line);
  }
}

/** Single-line tx receipt; `humanLine` defaults to `Tx: <txHash>`. */
export function emitTxLine(
  opts: { json?: boolean },
  command: string,
  txHash: string,
  humanLine?: string
): void {
  emitResult(opts, { command, txHash }, [humanLine ?? `Tx: ${txHash}`]);
}
