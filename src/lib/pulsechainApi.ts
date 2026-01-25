// PulseChain API Service - pls.aff.icu
// Live gas prices, PLS/USD rate, and network stats

const PLS_API_BASE = 'https://pls.aff.icu/api';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface NetworkData {
  genesis_block: number;
  latest_block: number;
  slow: number;
  medium: number;
  fast: number;
  base_fee: number;
  slow_priority: number;
  medium_priority: number;
  fast_priority: number;
  plsusd_rate: number;
  daily_tx: number;
  average_block_size: number;
  average_block_time: number;
  average_block_utilization: number;
  timestamp: number;
}

export interface GasPrices {
  slow: bigint;
  medium: bigint;
  fast: bigint;
  baseFee: bigint;
}

export interface GasPricesFormatted {
  slow: string;
  medium: string;
  fast: string;
  baseFee: string;
}

export interface TxCostEstimate {
  slow: { pls: string; usd: string };
  medium: { pls: string; usd: string };
  fast: { pls: string; usd: string };
}

export interface RpcServer {
  url: string;
  status: 'online' | 'offline';
  latency_ms: number;
  block_height: number;
}

// ═══════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════

/**
 * Fetch current network state (gas + price + stats)
 * Most comprehensive single call for dashboard display
 */
export async function getNetworkData(): Promise<NetworkData> {
  const res = await fetch(`${PLS_API_BASE}/network`, {
    next: { revalidate: 10 }, // Cache for 10 seconds in Next.js
  });
  if (!res.ok) throw new Error(`Network API error: ${res.status}`);
  return res.json();
}

/**
 * Get current PLS/USD rate
 */
export async function getPLSPrice(): Promise<number> {
  const data = await getNetworkData();
  return data.plsusd_rate;
}

/**
 * Get gas prices for TX submission
 */
export async function getGasPrices(): Promise<GasPrices> {
  const data = await getNetworkData();
  return {
    slow: BigInt(Math.floor(data.slow)),
    medium: BigInt(Math.floor(data.medium)),
    fast: BigInt(Math.floor(data.fast)),
    baseFee: BigInt(Math.floor(data.base_fee)),
  };
}

/**
 * Get online RPC servers for failover
 */
export async function getOnlineRpcServers(): Promise<RpcServer[]> {
  const res = await fetch(`${PLS_API_BASE}/rpc-servers?status=online`);
  if (!res.ok) throw new Error(`RPC API error: ${res.status}`);
  return res.json();
}

// ═══════════════════════════════════════
// FORMATTING UTILITIES
// ═══════════════════════════════════════

/**
 * Convert wei to gwei for display
 */
export function weiToGwei(wei: number | bigint): string {
  return (Number(wei) / 1e9).toFixed(2);
}

/**
 * Format gas prices from wei to gwei strings
 */
export function formatGasPrices(data: NetworkData): GasPricesFormatted {
  return {
    slow: weiToGwei(data.slow),
    medium: weiToGwei(data.medium),
    fast: weiToGwei(data.fast),
    baseFee: weiToGwei(data.base_fee),
  };
}

/**
 * Format PLS price for display
 */
export function formatPLSPrice(rate: number, decimals = 8): string {
  return rate.toFixed(decimals);
}

/**
 * Format PLS price as USD string
 */
export function formatPLSPriceUSD(rate: number): string {
  if (rate < 0.0001) {
    return `$${rate.toExponential(4)}`;
  }
  return `$${rate.toFixed(6)}`;
}

/**
 * Estimate TX cost in PLS and USD
 * @param gasLimit - Estimated gas for the transaction
 * @param data - Network data from API
 */
export function estimateTxCost(gasLimit: number, data: NetworkData): TxCostEstimate {
  const plsPrice = data.plsusd_rate;

  const calculate = (gasPrice: number) => {
    const costInPLS = (gasPrice * gasLimit) / 1e18;
    const costInUSD = costInPLS * plsPrice;
    return {
      pls: costInPLS.toFixed(2),
      usd: costInUSD < 0.01 ? '<$0.01' : `$${costInUSD.toFixed(2)}`,
    };
  };

  return {
    slow: calculate(data.slow),
    medium: calculate(data.medium),
    fast: calculate(data.fast),
  };
}

/**
 * Format block number with commas
 */
export function formatBlockNumber(block: number): string {
  return block.toLocaleString();
}

/**
 * Format daily TX count
 */
export function formatDailyTx(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(2)}M`;
  if (count >= 1_000) return `${(count / 1_000).toFixed(1)}K`;
  return count.toString();
}

/**
 * Convert PLS amount to USD
 */
export function plsToUSD(plsAmount: number | bigint, rate: number): string {
  const pls = typeof plsAmount === 'bigint' ? Number(plsAmount) / 1e18 : plsAmount;
  const usd = pls * rate;
  if (usd < 0.01) return '<$0.01';
  if (usd >= 1000) return `$${usd.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
  return `$${usd.toFixed(2)}`;
}

// ═══════════════════════════════════════
// GAS ESTIMATION PRESETS
// ═══════════════════════════════════════

export const GAS_LIMITS = {
  TRANSFER: 21000,
  ERC20_TRANSFER: 65000,
  SWAP_SIMPLE: 150000,
  SWAP_COMPLEX: 250000,
  TOKEN_BUY: 200000,
  TOKEN_SELL: 180000,
  TOKEN_CREATE: 3000000,
  GRADUATION: 500000,
} as const;

/**
 * Get estimated TX costs for common operations
 */
export async function getCommonTxCosts(): Promise<Record<keyof typeof GAS_LIMITS, TxCostEstimate>> {
  const data = await getNetworkData();
  return {
    TRANSFER: estimateTxCost(GAS_LIMITS.TRANSFER, data),
    ERC20_TRANSFER: estimateTxCost(GAS_LIMITS.ERC20_TRANSFER, data),
    SWAP_SIMPLE: estimateTxCost(GAS_LIMITS.SWAP_SIMPLE, data),
    SWAP_COMPLEX: estimateTxCost(GAS_LIMITS.SWAP_COMPLEX, data),
    TOKEN_BUY: estimateTxCost(GAS_LIMITS.TOKEN_BUY, data),
    TOKEN_SELL: estimateTxCost(GAS_LIMITS.TOKEN_SELL, data),
    TOKEN_CREATE: estimateTxCost(GAS_LIMITS.TOKEN_CREATE, data),
    GRADUATION: estimateTxCost(GAS_LIMITS.GRADUATION, data),
  };
}
