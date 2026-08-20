# AEP Foundry Tests

Run from `contracts/`.

## Full suite (unit + fuzz + invariant)

```bash
forge fmt --check
forge build
forge test -vv
```

## Base mainnet fork (pinned block)

Pinned block: **50000000** (Base mainnet, chainid 8453).

Factory: `0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546`  
EntryPoint: `0x0000000071727De22E5E9d8BAf0edAc6f37da032`

```bash
export BASE_MAINNET_RPC="${BASE_MAINNET_RPC:-https://mainnet.base.org}"
forge test --match-path test/BaseMainnetFork.t.sol -vvv \
  --fork-url "$BASE_MAINNET_RPC" --fork-block-number 50000000
```

Optional local Anvil fork:

```bash
anvil --fork-url "$BASE_MAINNET_RPC" --fork-block-number 50000000
forge test --match-path test/BaseMainnetFork.t.sol -vvv --fork-url http://127.0.0.1:8545
```

## Base Sepolia fork

Requires `BASE_SEPOLIA_RPC`:

```bash
forge test --match-contract BaseSepoliaFork -vvv --fork-url "$BASE_SEPOLIA_RPC"
```

## Coverage

```bash
forge coverage --report summary
```

Note: `via_ir = true` makes coverage slow; OOM may require skipping on low-memory hosts.

## CI profile

```bash
FOUNDRY_PROFILE=ci forge test -vv
```

Uses `fuzz.runs = 512`.
