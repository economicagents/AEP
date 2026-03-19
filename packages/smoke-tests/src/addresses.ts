/**
 * Base Sepolia deployed addresses (from docs/TESTNET-DEPLOYMENT.md).
 * Single source of truth for smoke tests.
 */
import type { Address } from "viem";

export const BASE_SEPOLIA_ADDRESSES = {
  aepAccountImpl: "0x2bfd6b18F9cd3748a686F6515Fc4582abFA47C20" as Address,
  aepAccountFactory: "0x8a9D077c1666FEa94Ce55C6D971f7a37f1F56546" as Address,
  creditFacilityFactory: "0xEDE0892A7d3F0CA6BE38e47d11fC14dd1c83A002" as Address,
  conditionalEscrowFactory: "0x931351A26ace9DFE357A488137E6a1E8Cb11aBbF" as Address,
  revenueSplitterFactory: "0xbE9406f87ff717E3F70D7687577D20D3Db336FC7" as Address,
  slaContractFactory: "0x120d84c04E171af06BB38C99b9e602b2c51866E2" as Address,
  firstAepAccount: "0x13A053aAAfa68807dfeD8FAe82C6242429D24A15" as Address,
  identityRegistry: "0x8004A818BFB912233c491871b3d84c89A494BD9e" as Address,
  reputationRegistry: "0x8004B663056A597Dffe9eCcC1965A193B7388713" as Address,
  validationRegistry: "0x8004Cb1BF31DAf7788923b405b754f57acEB4272" as Address,
  usdc: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address,
  entryPoint: "0x0000000071727De22E5E9d8BAf0edAc6f37da032" as Address,
} as const;
