/**
 * Consistent CLI errors with copy-pastable hints for agents and humans.
 */

export function exitWithHint(message: string, hintLines: string[]): never {
  console.error(`Error: ${message}`);
  for (const h of hintLines) {
    console.error(`  ${h}`);
  }
  process.exit(1);
}
