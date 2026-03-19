# Quick Start

0 to AEP in 15 minutes. See [Integration](guides/integration) for full reference.

> [!NOTE]
> Use Base Sepolia for testing. Mainnet deployment uses the same flow with `--rpc-url https://mainnet.base.org`.

---

## Prerequisites

- **Node.js** 18+
- **Foundry** (forge, anvil)
- **pnpm**

## Steps

1. **Deploy factory:** `cd contracts && PRIVATE_KEY=0x... forge script script/Deploy.s.sol --rpc-url https://sepolia.base.org --broadcast` → note factory address

2. **Deploy account:** `aep deploy --factory 0xFactoryAddress` (owner derived from PRIVATE_KEY) or `aep deploy --owner 0x... --factory 0x...`

3. **Set policies:** `aep policy-set -m <module> --max-per-tx 1000000 --max-daily 5000000 --max-weekly 20000000` (get module via `aep modules`)

4. **Optional — relationships:** `cd contracts && PRIVATE_KEY=0x... forge script script/DeployRelationships.s.sol --rpc-url https://sepolia.base.org --broadcast` → add factory addresses to `~/.aep/config.json`

5. **Optional — intent resolution:** `aep-index sync` (index at `~/.aep/index/`)

6. **Optional — API:** `cd packages/api && pnpm run build && node dist/index.js` (POST /resolve on port 3847)

See [REST API](reference/rest-api) for endpoints, [Intent Schema](reference/intent-schema), and [Integration](guides/integration) for full config.

## Config

`~/.aep/config.json` is created on first deploy.

> [!TIP]
> Key fields: `factoryAddress`, `rpcUrl`, `account`, `owner`. Add `identityRegistryAddress` and `reputationRegistryAddress` for counterparty policies.
