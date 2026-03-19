#!/usr/bin/env node
/**
 * Swap ETH for USDC on Base Sepolia via Uniswap V3.
 * Uses SwapRouter02. Prerequisites: .env with PRIVATE_KEY, BASE_SEPOLIA_RPC.
 *
 * Usage: node scripts/swap-for-usdc.mjs [ETH_AMOUNT]
 * Example: node scripts/swap-for-usdc.mjs 0.01
 *
 * E2E tests require ≥20 USDC. This script swaps ETH to get test USDC.
 */
import { createWalletClient, createPublicClient, http, parseEther, formatUnits } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { baseSepolia } from "viem/chains";
import { readFileSync, existsSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, "..");

// Base Sepolia addresses (from Uniswap docs)
const SWAP_ROUTER_02 = "0x94cC0AaC535CCDB3C01d6787D6413C739ae12bc4";
const WETH = "0x4200000000000000000000000000000000000006";
const USDC = "0x036CbD53842c5426634e7929541eC2318f3dCF7e";
const UNISWAP_V3_FACTORY = "0x4752ba5DBc23f44D87826276BF6Fd6b1C372aD24";

const POOL_FEES = [500, 3000, 10000]; // 0.05%, 0.3%, 1%

const SWAP_ROUTER_ABI = [
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountIn", type: "uint256" },
          { name: "amountOutMinimum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactInputSingle",
    outputs: [{ name: "amountOut", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      {
        components: [
          { name: "tokenIn", type: "address" },
          { name: "tokenOut", type: "address" },
          { name: "fee", type: "uint24" },
          { name: "recipient", type: "address" },
          { name: "amountOut", type: "uint256" },
          { name: "amountInMaximum", type: "uint256" },
          { name: "sqrtPriceLimitX96", type: "uint160" },
        ],
        name: "params",
        type: "tuple",
      },
    ],
    name: "exactOutputSingle",
    outputs: [{ name: "amountIn", type: "uint256" }],
    stateMutability: "payable",
    type: "function",
  },
];

const WETH_ABI = [
  { inputs: [], name: "deposit", outputs: [], stateMutability: "payable", type: "function" },
  {
    inputs: [{ name: "spender", type: "address" }, { name: "amount", type: "uint256" }],
    name: "approve",
    outputs: [{ name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
];

const FACTORY_ABI = [
  {
    inputs: [
      { name: "tokenA", type: "address" },
      { name: "tokenB", type: "address" },
      { name: "fee", type: "uint24" },
    ],
    name: "getPool",
    outputs: [{ name: "pool", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
];

function loadEnv() {
  const envPath = resolve(REPO_ROOT, ".env");
  if (!existsSync(envPath)) {
    console.error("Error: .env not found. Create .env with PRIVATE_KEY and BASE_SEPOLIA_RPC.");
    process.exit(1);
  }
  const content = readFileSync(envPath, "utf8");
  const env = {};
  for (const line of content.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
  return env;
}

async function findPoolWithLiquidity(publicClient) {
  for (const fee of POOL_FEES) {
    const pool = await publicClient.readContract({
      address: UNISWAP_V3_FACTORY,
      abi: FACTORY_ABI,
      functionName: "getPool",
      args: [WETH, USDC, fee],
    });
    if (pool && pool !== "0x0000000000000000000000000000000000000000") {
      const code = await publicClient.getBytecode({ address: pool });
      if (code && code !== "0x") return { pool, fee };
    }
  }
  return null;
}

async function main() {
  const env = loadEnv();
  const privateKey = env.PRIVATE_KEY;
  const rpcUrl = env.BASE_SEPOLIA_RPC || "https://sepolia.base.org";

  if (!privateKey || !privateKey.startsWith("0x") || !/^0x[a-fA-F0-9]{64}$/.test(privateKey)) {
    console.error("Error: PRIVATE_KEY required in .env (0x + 64 hex chars)");
    process.exit(1);
  }

  const arg1 = process.argv[2];
  const arg2 = (process.argv[3] || "").toLowerCase();
  const exactOutputUsdc = arg2 === "usdc" && arg1 ? parseFloat(arg1) : null;

  let amountWei;
  let amountOutUsdc;
  if (exactOutputUsdc != null && !isNaN(exactOutputUsdc) && exactOutputUsdc > 0 && exactOutputUsdc <= 1000000) {
    amountOutUsdc = BigInt(Math.floor(exactOutputUsdc * 1e6));
    amountWei = parseEther("0.09"); // max WETH to spend for exact output (leave buffer for gas)
  } else {
    const ethAmount = arg1 ? parseFloat(arg1) : 0.01;
    if (isNaN(ethAmount) || ethAmount <= 0 || ethAmount > 100) {
      console.error("Usage: node scripts/swap-for-usdc.mjs [ETH_AMOUNT]");
      console.error("       node scripts/swap-for-usdc.mjs [USDC_AMOUNT] usdc");
      console.error("Example: node scripts/swap-for-usdc.mjs 0.01");
      console.error("Example: node scripts/swap-for-usdc.mjs 20 usdc");
      process.exit(1);
    }
    amountWei = parseEther(ethAmount.toString());
  }

  const account = privateKeyToAccount(privateKey);

  const publicClient = createPublicClient({
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http(rpcUrl),
  });

  console.log(`Swapping ${amountOutUsdc ? `${formatUnits(amountOutUsdc, 6)} USDC (exact out)` : formatUnits(amountWei, 18) + " ETH"} for USDC on Base Sepolia...`);
  console.log(`Wallet: ${account.address}`);

  const ethBalance = await publicClient.getBalance({ address: account.address });
  if (ethBalance < amountWei) {
    console.error(`Error: Insufficient ETH. Have ${formatUnits(ethBalance, 18)} ETH, need ${formatUnits(amountWei, 18)} ETH.`);
    console.error("Get testnet ETH from https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
    process.exit(1);
  }

  const poolInfo = await findPoolWithLiquidity(publicClient);
  if (!poolInfo) {
    console.error("Error: No WETH/USDC pool found on Base Sepolia. Liquidity may not exist.");
    process.exit(1);
  }
  console.log(`Using pool fee tier: ${poolInfo.fee / 10000}%`);

  const txOpts = async () => {
    const block = await publicClient.getBlock();
    const baseFee = block.baseFeePerGas ?? 1n;
    return {
      maxFeePerGas: (baseFee * 2n) + parseEther("0.000000002"),
      maxPriorityFeePerGas: parseEther("0.000000001"),
    };
  };

  // 1. Wrap ETH to WETH
  console.log("1. Wrapping ETH to WETH...");
  const wrapHash = await walletClient.writeContract({
    address: WETH,
    abi: WETH_ABI,
    functionName: "deposit",
    value: amountWei,
    ...(await txOpts()),
  });
  await publicClient.waitForTransactionReceipt({ hash: wrapHash });
  console.log(`   Wrapped. Tx: ${wrapHash}`);
  await new Promise((r) => setTimeout(r, 2000));

  // 2. Approve SwapRouter02 (skip if already approved)
  const currentAllowance = await publicClient.readContract({
    address: WETH,
    abi: [{ inputs: [{ name: "owner", type: "address" }, { name: "spender", type: "address" }], name: "allowance", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" }],
    functionName: "allowance",
    args: [account.address, SWAP_ROUTER_02],
  });
  if (currentAllowance >= amountWei) {
    console.log("2. Approval already sufficient, skipping...");
  } else {
    console.log("2. Approving SwapRouter02...");
    const approveHash = await walletClient.writeContract({
      address: WETH,
      abi: WETH_ABI,
      functionName: "approve",
      args: [SWAP_ROUTER_02, amountWei],
      ...(await txOpts()),
    });
    await publicClient.waitForTransactionReceipt({ hash: approveHash });
    console.log(`   Approved. Tx: ${approveHash}`);
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 3. Swap WETH -> USDC
  console.log("3. Swapping WETH -> USDC...");
  let swapHash;
  try {
    swapHash = amountOutUsdc
      ? await walletClient.writeContract({
          ...(await txOpts()),
          address: SWAP_ROUTER_02,
          abi: SWAP_ROUTER_ABI,
          functionName: "exactOutputSingle",
          args: [
            {
              tokenIn: WETH,
              tokenOut: USDC,
              fee: poolInfo.fee,
              recipient: account.address,
              amountOut: amountOutUsdc,
              amountInMaximum: amountWei,
              sqrtPriceLimitX96: 0n,
            },
          ],
        })
      : await walletClient.writeContract({
          ...(await txOpts()),
          address: SWAP_ROUTER_02,
          abi: SWAP_ROUTER_ABI,
          functionName: "exactInputSingle",
          args: [
            {
              tokenIn: WETH,
              tokenOut: USDC,
              fee: poolInfo.fee,
              recipient: account.address,
              amountIn: amountWei,
              amountOutMinimum: 0n,
              sqrtPriceLimitX96: 0n,
            },
          ],
        });
  } catch (err) {
    const msg = err?.cause?.shortMessage ?? err?.message ?? String(err);
    if (msg.includes("revert") || msg.includes("STF") || msg.includes("execution reverted")) {
      console.error("\nSwap reverted. The WETH/USDC pool on Base Sepolia often has no liquidity.");
      console.error("Get USDC directly from the faucet instead:");
      console.error("  https://faucet.circle.com/ (20 USDC, Base Sepolia)");
      console.error("  https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
      process.exit(1);
    }
    throw err;
  }
  const receipt = await publicClient.waitForTransactionReceipt({ hash: swapHash });
  console.log(`   Swapped. Tx: ${swapHash}`);

  const ERC20_ABI = [
    { inputs: [{ name: "account", type: "address" }], name: "balanceOf", outputs: [{ type: "uint256" }], stateMutability: "view", type: "function" },
  ];
  const usdcBalance = await publicClient.readContract({
    address: USDC,
    abi: ERC20_ABI,
    functionName: "balanceOf",
    args: [account.address],
  });
  console.log(`\nDone. USDC balance: ${formatUnits(usdcBalance, 6)} USDC`);
  if (usdcBalance === 0n) {
    console.log("\nNote: Pool may have no liquidity on Base Sepolia. Get testnet USDC directly:");
    console.log("  https://faucet.circle.com/ (20 USDC, Base Sepolia)");
    console.log("  https://www.coinbase.com/faucets/base-ethereum-goerli-faucet");
  } else {
    console.log(`E2E tests need ≥20 USDC. Run with larger amount if needed.`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
