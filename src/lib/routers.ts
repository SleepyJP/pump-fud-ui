/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * PUMP.FUD Multi-Router System
 * Routes through all PulseChain DEXes to find best prices
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import { formatEther, parseEther, type PublicClient } from 'viem';

// ═══════════════════════════════════════════════════════════════════════════════
// ROUTER ADDRESSES - ALL PULSECHAN DEXES
// ═══════════════════════════════════════════════════════════════════════════════
export const ROUTERS = {
  PULSEX_V1: '0x98bf93ebf5c380C0e6Ae8e192A7e2AE08edAcc02' as const,      // PulseXRouter01
  PULSEX_V2: '0x165C3410fC91EF562C50559f7d2289fEbed552d9' as const,      // PulseXRouter02
  PAISLEY_SMART: '0xCbebb17E6b8Fc9F5236E99fCBfbF04fe90D5047e' as const,  // PaisleySwapSmartRouter (Shanghai EVM)
  PAISLEY_V2: '0xCedfC71F1Af4F2A146F7225f9da06ef90f9c11f0' as const,     // Paisley V2 Router (Shanghai EVM)
} as const;

// WPLS for DEX swaps
export const WPLS = '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as const;

// Router display names
export const ROUTER_NAMES: Record<string, string> = {
  [ROUTERS.PULSEX_V1]: 'PulseX V1',
  [ROUTERS.PULSEX_V2]: 'PulseX V2',
  [ROUTERS.PAISLEY_SMART]: 'Paisley Smart',
  [ROUTERS.PAISLEY_V2]: 'Paisley V2',
};

// Uniswap V2 Router ABI (works for all routers)
export const ROUTER_ABI = [
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsOut',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOut', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
    ],
    name: 'getAmountsIn',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactETHForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
    outputs: [],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETH',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
    outputs: [],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'uint256', name: 'amountIn', type: 'uint256' },
      { internalType: 'uint256', name: 'amountOutMin', type: 'uint256' },
      { internalType: 'address[]', name: 'path', type: 'address[]' },
      { internalType: 'address', name: 'to', type: 'address' },
      { internalType: 'uint256', name: 'deadline', type: 'uint256' },
    ],
    name: 'swapExactTokensForTokens',
    outputs: [{ internalType: 'uint256[]', name: 'amounts', type: 'uint256[]' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

// ERC20 approve ABI
export const ERC20_APPROVE_ABI = [
  {
    inputs: [
      { internalType: 'address', name: 'spender', type: 'address' },
      { internalType: 'uint256', name: 'amount', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ internalType: 'bool', name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    inputs: [
      { internalType: 'address', name: 'owner', type: 'address' },
      { internalType: 'address', name: 'spender', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ internalType: 'uint256', name: '', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export interface RouteQuote {
  router: `0x${string}`;
  routerName: string;
  amountOut: bigint;
  path: `0x${string}`[];
  priceImpact?: number;
}

/**
 * Get quotes from all routers and return the best one
 */
export async function getBestQuote(
  publicClient: PublicClient,
  amountIn: bigint,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
): Promise<RouteQuote | null> {
  const path: `0x${string}`[] = [tokenIn, tokenOut];
  const routerAddresses = Object.values(ROUTERS) as `0x${string}`[];

  const quotes = await Promise.allSettled(
    routerAddresses.map(async (router) => {
      try {
        const amounts = await publicClient.readContract({
          address: router,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
        }) as bigint[];

        return {
          router,
          routerName: ROUTER_NAMES[router] || 'Unknown',
          amountOut: amounts[amounts.length - 1],
          path,
        } satisfies RouteQuote;
      } catch {
        return null;
      }
    })
  );

  // Filter successful quotes and find best
  const validQuotes = quotes
    .filter((r): r is PromiseFulfilledResult<RouteQuote | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((q): q is RouteQuote => q !== null && q.amountOut > BigInt(0));

  if (validQuotes.length === 0) return null;

  // Sort by amountOut descending (best first)
  validQuotes.sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));

  return validQuotes[0];
}

/**
 * Get quotes from ALL routers for display
 */
export async function getAllQuotes(
  publicClient: PublicClient,
  amountIn: bigint,
  tokenIn: `0x${string}`,
  tokenOut: `0x${string}`,
): Promise<RouteQuote[]> {
  const path: `0x${string}`[] = [tokenIn, tokenOut];
  const routerAddresses = Object.values(ROUTERS) as `0x${string}`[];

  const quotes = await Promise.allSettled(
    routerAddresses.map(async (router) => {
      try {
        const amounts = await publicClient.readContract({
          address: router,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [amountIn, path],
        }) as bigint[];

        return {
          router,
          routerName: ROUTER_NAMES[router] || 'Unknown',
          amountOut: amounts[amounts.length - 1],
          path,
        } satisfies RouteQuote;
      } catch {
        return null;
      }
    })
  );

  return quotes
    .filter((r): r is PromiseFulfilledResult<RouteQuote | null> => r.status === 'fulfilled')
    .map(r => r.value)
    .filter((q): q is RouteQuote => q !== null && q.amountOut > BigInt(0))
    .sort((a, b) => (b.amountOut > a.amountOut ? 1 : -1));
}

/**
 * Calculate minimum output with slippage
 */
export function calculateMinOutput(amountOut: bigint, slippageBps: number): bigint {
  return (amountOut * BigInt(10000 - slippageBps)) / BigInt(10000);
}

/**
 * Format quote for display
 */
export function formatQuoteDisplay(quote: RouteQuote, decimals = 4): string {
  return `${parseFloat(formatEther(quote.amountOut)).toFixed(decimals)} via ${quote.routerName}`;
}

/**
 * Get deadline timestamp (default 20 minutes)
 */
export function getDeadline(minutes = 20): bigint {
  return BigInt(Math.floor(Date.now() / 1000) + minutes * 60);
}
