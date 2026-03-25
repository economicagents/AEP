import { execFileSync } from "child_process";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { describe, expect, it } from "vitest";

const __dirname = dirname(fileURLToPath(import.meta.url));
const cliJs = join(__dirname, "..", "dist", "cli.js");

function runCli(
  args: string[],
  env?: NodeJS.ProcessEnv
): { status: number; stdout: string; stderr: string } {
  try {
    const stdout = execFileSync(process.execPath, [cliJs, ...args], {
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      env: env ? { ...process.env, ...env } : process.env,
    });
    return { status: 0, stdout, stderr: "" };
  } catch (e: unknown) {
    const err = e as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: err.status ?? 1,
      stdout: err.stdout?.toString?.() ?? "",
      stderr: err.stderr?.toString?.() ?? "",
    };
  }
}

describe("aep CLI (agent ergonomics)", () => {
  it("root --help includes workflow hints", () => {
    const { status, stdout } = runCli(["--help"]);
    expect(status).toBe(0);
    expect(stdout).toContain("Typical flows");
  });

  it("deploy --help lists examples and skip-config flags", () => {
    const { status, stdout } = runCli(["deploy", "--help"]);
    expect(status).toBe(0);
    expect(stdout).toMatch(/skip-config-write|if-not-configured/);
    expect(stdout).toContain("Examples:");
  });

  it("balance without account exits with actionable hint", () => {
    const bogusConfig = join(__dirname, "nonexistent-aep-config-928374.json");
    const { status, stderr } = runCli(["balance"], {
      AEP_CONFIG_PATH: bogusConfig,
    });
    expect(status).toBe(1);
    expect(stderr).toMatch(/aep balance -a/i);
  });

  it("resolve without capability or intent-file exits with hint", () => {
    const { status, stderr } = runCli(["resolve"]);
    expect(status).toBe(1);
    expect(stderr).toMatch(/--capability|intent-file/i);
  });

  it("config validate --json prints JSON when config missing", () => {
    const bogusConfig = join(__dirname, "nonexistent-config-73621.json");
    const { status, stdout } = runCli(["config", "validate", "--json"], {
      AEP_CONFIG_PATH: bogusConfig,
    });
    expect(status).toBe(0);
    const j = JSON.parse(stdout.trim()) as { command?: string; status?: string };
    expect(j.command).toBe("config validate");
    expect(j.status).toBe("missing");
  });
});
