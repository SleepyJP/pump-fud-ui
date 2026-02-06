import { parseAbi } from 'viem';

// Treasury wallet - receives:
// - 0.5% from buys (immediately)
// - 0.6% from sells (immediately)
// - 10% graduation success fee
export const TREASURY_WALLET = '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const;

// Fee structure
export const FEES = {
  // Buy fee: 1.0% total
  BUY_TOTAL_BPS: 100, // 1.0%
  BUY_USER_BPS: 50,   // 0.5% to user airdrop pool
  BUY_TREASURY_BPS: 50, // 0.5% to treasury

  // Sell fee: 1.1% total
  SELL_TOTAL_BPS: 110, // 1.1%
  SELL_USER_BPS: 50,   // 0.5% to user airdrop pool
  SELL_TREASURY_BPS: 60, // 0.6% to treasury

  // Graduation success fee
  GRADUATION_FEE_BPS: 1000, // 10% of liquidity to treasury before DEX distribution

  // Referral fee (from treasury portion)
  REFERRAL_BPS: 25, // 0.25% to referrer (taken from treasury portion)
} as const;

// Liquidity distribution on graduation (after 10% treasury fee)
export const GRADUATION_LIQUIDITY = {
  PULSEX_V2_PERCENT: 10, // 10% to PulseX V2
  PAISLEY_V2_PERCENT: 10, // 10% to Paisley Swap V2
  // LP tokens burned to dead address
} as const;

// Factory ABI - events we need to track (V4 Factory)
// CONFIRMED: TokenCreated(address indexed token, address indexed creator, string name, string symbol, address referrer)
// Hash: 0xe7ccb755d59584cc03bd0ede36a43d0b698308216a1c6797e0b00e6bf5afefaf
export const FACTORY_ABI = parseAbi([
  'event TokenCreated(address indexed token, address indexed creator, string name, string symbol, address referrer)',
  'event InitialBuy(address indexed token, address indexed buyer, uint256 plsSpent, uint256 tokensReceived)',
]);

// Token ABI - swap events
// FIXED: TokenBought/TokenSold with correct signatures
export const TOKEN_ABI = parseAbi([
  'event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)',
  'event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)',
  'event Transfer(address indexed from, address indexed to, uint256 value)',
  'function graduated() view returns (bool)',
  'function deleted() view returns (bool)',
  'function plsReserve() view returns (uint256)',
  'function creator() view returns (address)',
  'function getCurrentPrice() view returns (uint256)',
  'function name() view returns (string)',
  'function symbol() view returns (string)',
]);

// Chain config
export const CHAIN = {
  id: 369,
  name: 'PulseChain',
  rpcUrl: process.env.RPC_URL || 'https://rpc.pulsechain.com',
  blockTime: 10, // ~10 seconds per block
} as const;

// Indexer config
export const INDEXER_CONFIG = {
  // How many blocks to process per batch
  BATCH_SIZE: 1000,
  // Polling interval (ms) for new blocks
  POLL_INTERVAL: 10000,
  // Confirmations before processing
  CONFIRMATIONS: 2,
} as const;

// Calculate fees from amount
export function calculateBuyFees(plsAmount: bigint): {
  totalFee: bigint;
  userFee: bigint;
  treasuryFee: bigint;
} {
  const totalFee = (plsAmount * BigInt(FEES.BUY_TOTAL_BPS)) / 10000n;
  const userFee = (plsAmount * BigInt(FEES.BUY_USER_BPS)) / 10000n;
  const treasuryFee = (plsAmount * BigInt(FEES.BUY_TREASURY_BPS)) / 10000n;

  return { totalFee, userFee, treasuryFee };
}

export function calculateSellFees(plsAmount: bigint): {
  totalFee: bigint;
  userFee: bigint;
  treasuryFee: bigint;
} {
  const totalFee = (plsAmount * BigInt(FEES.SELL_TOTAL_BPS)) / 10000n;
  const userFee = (plsAmount * BigInt(FEES.SELL_USER_BPS)) / 10000n;
  const treasuryFee = (plsAmount * BigInt(FEES.SELL_TREASURY_BPS)) / 10000n;

  return { totalFee, userFee, treasuryFee };
}

export function calculateGraduationFee(liquidityAmount: bigint): bigint {
  return (liquidityAmount * BigInt(FEES.GRADUATION_FEE_BPS)) / 10000n;
}

export function calculateReferralFee(treasuryFee: bigint): bigint {
  // Referral fee comes out of treasury portion
  return (treasuryFee * BigInt(FEES.REFERRAL_BPS * 2)) / BigInt(FEES.BUY_TREASURY_BPS);
}
