// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Tax Token Types
// Fee-on-transfer token configuration and reward tracking
// Built by AQUEMINI for THE pHuD FARM
// ═══════════════════════════════════════════════════════════════════════════

import { type Address } from 'viem';

/**
 * Tax configuration for fee-on-transfer tokens
 * All values in basis points (100 = 1%)
 */
export interface TaxConfig {
  buyTaxBps: number;      // Tax on buys (max 1000 = 10%)
  sellTaxBps: number;     // Tax on sells (max 1000 = 10%)
  burnShare: number;      // % of tax to burn
  rewardShare: number;    // % of tax to holder rewards
  liquidityShare: number; // % of tax to auto-LP
  treasuryShare: number;  // % of tax to treasury (min 10%)
  buybackShare: number;   // % of tax for buyback & burn
  rewardToken: Address;   // Token used for rewards (WPLS, HEX, SELF, etc)
  treasuryWallet: Address;
  taxEnabled: boolean;    // Active after graduation
  taxLocked: boolean;     // If true, rates can never increase
}

/**
 * Form data for creating a new tax token
 */
export interface TaxTokenFormData {
  name: string;
  symbol: string;
  description: string;
  image: File | null;
  imageUri?: string;
  twitter?: string;
  telegram?: string;
  website?: string;
  isTaxToken: boolean;
  taxConfig: TaxConfig | null;
}

/**
 * Reward token options for tax distribution
 */
export type RewardTokenOption = 'PLS' | 'WPLS' | 'HEX' | 'PLSX' | 'INC' | 'SELF' | 'CUSTOM';

/**
 * PulseChain reward token addresses
 */
export const REWARD_TOKEN_ADDRESSES: Record<RewardTokenOption, Address> = {
  PLS: '0x0000000000000000000000000000000000000000',  // Native PLS
  WPLS: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27', // Wrapped PLS
  HEX: '0x2b591e99afE9f32eAA6214f7B7629768c40Eeb39',  // HEX
  PLSX: '0x95B303987A60C71504D99Aa1b13B4DA07b0790ab', // PulseX
  INC: '0x2fa878Ab3F87CC1C9737Fc071108F904c0B0C95d',  // Incentive
  SELF: '0x0000000000000000000000000000000000000001',  // Token itself (reflection)
  CUSTOM: '0x0000000000000000000000000000000000000000', // User-specified
};

/**
 * Reward token display info
 */
export const REWARD_TOKEN_INFO: Record<RewardTokenOption, { name: string; symbol: string; icon: string }> = {
  PLS: { name: 'PulseChain', symbol: 'PLS', icon: '💚' },
  WPLS: { name: 'Wrapped PLS', symbol: 'WPLS', icon: '🟢' },
  HEX: { name: 'HEX', symbol: 'HEX', icon: '🔶' },
  PLSX: { name: 'PulseX', symbol: 'PLSX', icon: '🔷' },
  INC: { name: 'Incentive', symbol: 'INC', icon: '💎' },
  SELF: { name: 'Self (Reflection)', symbol: 'SELF', icon: '🔄' },
  CUSTOM: { name: 'Custom Token', symbol: 'CUSTOM', icon: '⚙️' },
};

/**
 * Default tax configuration (sensible defaults)
 */
export const DEFAULT_TAX_CONFIG: TaxConfig = {
  buyTaxBps: 500,        // 5% buy tax
  sellTaxBps: 500,       // 5% sell tax
  burnShare: 20,         // 20% burned
  rewardShare: 30,       // 30% to holders
  liquidityShare: 20,    // 20% to LP
  treasuryShare: 20,     // 20% to treasury
  buybackShare: 10,      // 10% buyback
  rewardToken: REWARD_TOKEN_ADDRESSES.PLS,
  treasuryWallet: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as Address,
  taxEnabled: false,     // Disabled until graduation
  taxLocked: false,
};

/**
 * Tax token statistics for dashboard
 */
export interface TaxTokenStats {
  // Tax rates
  buyTaxPercent: number;
  sellTaxPercent: number;

  // Distribution breakdown
  burnShare: number;
  rewardShare: number;
  liquidityShare: number;
  treasuryShare: number;
  buybackShare: number;

  // Lifetime totals
  totalTaxCollected: bigint;
  totalBurned: bigint;
  totalRewardsDistributed: bigint;
  totalLiquidityAdded: bigint;
  totalTreasuryReceived: bigint;
  totalBuybackBurned: bigint;

  // Status
  graduated: boolean;
  taxEnabled: boolean;
  taxLocked: boolean;
  rewardToken: Address;
  rewardTokenSymbol: string;
}

/**
 * Holder reward info for individual wallet
 */
export interface HolderRewardInfo {
  address: Address;
  balance: bigint;
  balancePercent: number;
  pendingRewards: bigint;
  totalClaimed: bigint;
  lastClaimTime: number;
  canClaim: boolean;
}

/**
 * Token metadata stored in description JSON
 */
export interface TokenMetadata {
  description: string;
  socials?: {
    twitter?: string;
    telegram?: string;
    website?: string;
    discord?: string;
  };
  taxConfig?: TaxConfig;
  createdAt?: number;
  version?: string;
}

/**
 * Parse token metadata from description string
 */
export function parseTokenMetadata(descriptionRaw: string): TokenMetadata | null {
  if (!descriptionRaw) return null;
  try {
    return JSON.parse(descriptionRaw) as TokenMetadata;
  } catch {
    // If it's not JSON, treat as plain description
    return { description: descriptionRaw };
  }
}

/**
 * Check if token is a tax token based on metadata
 */
export function isTaxToken(metadata: TokenMetadata | null): boolean {
  return metadata?.taxConfig !== undefined && metadata.taxConfig !== null;
}

/**
 * Validate tax config shares sum to 100%
 */
export function validateTaxShares(config: TaxConfig): { valid: boolean; total: number } {
  const total = config.burnShare + config.rewardShare + config.liquidityShare +
                config.treasuryShare + config.buybackShare;
  return { valid: total === 100, total };
}

/**
 * Format basis points to percentage string
 */
export function bpsToPercent(bps: number): string {
  return (bps / 100).toFixed(1) + '%';
}
