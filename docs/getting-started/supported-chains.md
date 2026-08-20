# Supported Chains

AEP runs on Base (EVM). Primary testnet: Base Sepolia. Mainnet: Base.

## Base Sepolia (Testnet)

| Chain ID | RPC |
|----------|-----|
| 84532 | `https://sepolia.base.org` |

### Canonical Addresses

| Contract | Address |
|----------|---------|
| EntryPoint v0.7 | `0x0000000071727De22E5E9d8BAf0edAc6f37da032` |
| Identity Registry (ERC-8004) | `0x8004A818BFB912233c491871b3d84c89A494BD9e` |
| Reputation Registry (ERC-8004) | `0x8004B663056A597Dffe9eCcC1965A193B7388713` |
| Validation Registry (ERC-8004) | `0x8004Cb1BF31DAf7788923b405b754f57acEB4272` |
| USDC | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| AEPAccountFactory | `0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546` |
| CreditFacilityFactory | `0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002` |
| ConditionalEscrowFactory | `0x931351A26ace9DFE357A488137E6a1E8Cb11aBbF` |
| RevenueSplitterFactory | `0xbE9406f87ff717E3F70D7687577D20D3Db336FC7` |
| SLAContractFactory | `0x120d84c04E171af06BB38C99b9e602b2c51866E2` |

Deploy your own factories via Foundry only if you need a custom deployment — see [Deployment](guides/deployment). For npm-first onboarding, use the factory row above with [Quick start](getting-started/quickstart).

## Base Mainnet

| Chain ID | RPC |
|----------|-----|
| 8453 | `https://mainnet.base.org` |

### Canonical Addresses

| Contract | Address |
|----------|---------|
| Identity Registry (ERC-8004) | `0x8004A169FB4a3325136EB29fA0ceB6D2e539a432` |
| Reputation Registry (ERC-8004) | `0x8004BAa17C55a88189AE136b182e5fdA19dE9b63` |
| Validation Registry (ERC-8004) | `0x8004Cc8439f36fd5F9F049D9fF86523Df6dAAB58` |
| USDC | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` |
| AEPAccountFactory | `0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546` |

Relationship factory addresses match the Sepolia deployment pattern — see [Deployment — mainnet table](guides/deployment#mainnet-live-addresses-and-record).

## Chain Override

Set `AEP_CHAIN_ID` to override (84532 for Base Sepolia, 8453 for Base mainnet).
