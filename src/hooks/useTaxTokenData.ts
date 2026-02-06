'use client';

import { useMemo } from 'react';
import { useReadContract, useReadContracts, useAccount } from 'wagmi';
import { type Address } from 'viem';
import {
  type TaxConfig,
  type TaxTokenStats,
  type HolderRewardInfo,
  parseTokenMetadata,
  isTaxToken as checkIsTaxToken,
  DEFAULT_TAX_CONFIG,
} from '@/types/taxToken';
import { TOKEN_ABI } from '@/config/abis';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Tax Token Data Hook
// Fetches tax configuration and reward data for fee-on-transfer tokens
// ═══════════════════════════════════════════════════════════════════════════

// Extended ABI for tax token functions
const TAX_TOKEN_ABI = [
  ...TOKEN_ABI,
  // Tax config
  {
    inputs: [],
    name: 'getTaxConfig',
    outputs: [
      {
        components: [
          { name: 'buyTaxBps', type: 'uint16' },
          { name: 'sellTaxBps', type: 'uint16' },
          { name: 'burnShare', type: 'uint16' },
          { name: 'rewardShare', type: 'uint16' },
          { name: 'liquidityShare', type: 'uint16' },
          { name: 'treasuryShare', type: 'uint16' },
          { name: 'buybackShare', type: 'uint16' },
          { name: 'rewardToken', type: 'address' },
          { name: 'treasuryWallet', type: 'address' },
          { name: 'taxEnabled', type: 'bool' },
          { name: 'taxLocked', type: 'bool' },
        ],
        name: 'config',
        type: 'tuple',
      },
    ],
    stateMutability: 'view',
    type: 'function',
  },
  // Reward functions
  {
    inputs: [{ name: 'holder', type: 'address' }],
    name: 'getPendingRewards',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'holder', type: 'address' }],
    name: 'getTotalClaimed',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [{ name: 'amount', type: 'uint256' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
  // Stats
  {
    inputs: [],
    name: 'totalTaxCollected',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalBurned',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'totalRewardsDistributed',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [],
    name: 'isTaxToken',
    outputs: [{ type: 'bool' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

interface UseTaxTokenDataResult {
  // Core data
  isTaxToken: boolean;
  taxConfig: TaxConfig | null;
  stats: Partial<TaxTokenStats> | null;
  graduated: boolean;

  // User reward data
  pendingRewards: bigint;
  totalClaimed: bigint;
  canClaim: boolean;

  // Loading states
  isLoading: boolean;
  isError: boolean;
  error: Error | null;

  // Refetch
  refetch: () => void;
}

export function useTaxTokenData(tokenAddress: Address): UseTaxTokenDataResult {
  const { address: userAddress, isConnected } = useAccount();

  // Check if token has tax config by reading description
  const { data: descriptionRaw } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'description',
    query: { enabled: !!tokenAddress },
  });

  // Parse metadata to check for tax config
  const metadata = useMemo(() => {
    if (!descriptionRaw) return null;
    return parseTokenMetadata(descriptionRaw as string);
  }, [descriptionRaw]);

  const hasTaxConfig = checkIsTaxToken(metadata);

  // Get graduation status
  const { data: graduated } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'graduated',
    query: { enabled: !!tokenAddress },
  });

  // Try to read on-chain tax config (for V2+ tax tokens)
  const { data: onChainTaxConfig, isLoading: isLoadingConfig } = useReadContract({
    address: tokenAddress,
    abi: TAX_TOKEN_ABI,
    functionName: 'getTaxConfig',
    query: { enabled: !!tokenAddress && hasTaxConfig },
  });

  // Get pending rewards for connected user
  const { data: pendingRewardsRaw, refetch: refetchRewards } = useReadContract({
    address: tokenAddress,
    abi: TAX_TOKEN_ABI,
    functionName: 'getPendingRewards',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress && hasTaxConfig },
  });

  // Get total claimed by user
  const { data: totalClaimedRaw } = useReadContract({
    address: tokenAddress,
    abi: TAX_TOKEN_ABI,
    functionName: 'getTotalClaimed',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress && hasTaxConfig },
  });

  // Get lifetime stats (multicall for efficiency)
  const statsContracts = hasTaxConfig
    ? [
        {
          address: tokenAddress,
          abi: TAX_TOKEN_ABI,
          functionName: 'totalTaxCollected',
        },
        {
          address: tokenAddress,
          abi: TAX_TOKEN_ABI,
          functionName: 'totalBurned',
        },
        {
          address: tokenAddress,
          abi: TAX_TOKEN_ABI,
          functionName: 'totalRewardsDistributed',
        },
      ]
    : [];

  const { data: statsData, isLoading: isLoadingStats, isError, error } = useReadContracts({
    contracts: statsContracts as any,
    query: { enabled: statsContracts.length > 0 },
  });

  // Build tax config from on-chain or metadata
  const taxConfig: TaxConfig | null = useMemo(() => {
    // Prefer on-chain config if available
    if (onChainTaxConfig) {
      return {
        buyTaxBps: (onChainTaxConfig as any).buyTaxBps || 0,
        sellTaxBps: (onChainTaxConfig as any).sellTaxBps || 0,
        burnShare: (onChainTaxConfig as any).burnShare || 0,
        rewardShare: (onChainTaxConfig as any).rewardShare || 0,
        liquidityShare: (onChainTaxConfig as any).liquidityShare || 0,
        treasuryShare: (onChainTaxConfig as any).treasuryShare || 0,
        buybackShare: (onChainTaxConfig as any).buybackShare || 0,
        rewardToken: (onChainTaxConfig as any).rewardToken || '0x0000000000000000000000000000000000000000',
        treasuryWallet: (onChainTaxConfig as any).treasuryWallet || '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B',
        taxEnabled: (onChainTaxConfig as any).taxEnabled || false,
        taxLocked: (onChainTaxConfig as any).taxLocked || false,
      };
    }

    // Fall back to metadata config
    if (metadata?.taxConfig) {
      return metadata.taxConfig;
    }

    return null;
  }, [onChainTaxConfig, metadata]);

  // Build stats object
  const stats: Partial<TaxTokenStats> | null = useMemo(() => {
    if (!hasTaxConfig || !statsData) return null;

    return {
      totalTaxCollected: (statsData[0]?.result as bigint) || 0n,
      totalBurned: (statsData[1]?.result as bigint) || 0n,
      totalRewardsDistributed: (statsData[2]?.result as bigint) || 0n,
    };
  }, [hasTaxConfig, statsData]);

  const pendingRewards = (pendingRewardsRaw as bigint) || 0n;
  const totalClaimed = (totalClaimedRaw as bigint) || 0n;
  const canClaim = isConnected && pendingRewards > 0n && (graduated as boolean);

  const refetch = () => {
    refetchRewards();
  };

  return {
    isTaxToken: hasTaxConfig,
    taxConfig,
    stats,
    graduated: (graduated as boolean) || false,
    pendingRewards,
    totalClaimed,
    canClaim,
    isLoading: isLoadingConfig || isLoadingStats,
    isError,
    error: error as Error | null,
    refetch,
  };
}

/**
 * Hook to get reward info for multiple holders
 */
export function useHoldersRewardInfo(
  tokenAddress: Address,
  holders: Address[]
): { data: HolderRewardInfo[]; isLoading: boolean } {
  const contracts = holders.flatMap((holder) => [
    {
      address: tokenAddress,
      abi: TAX_TOKEN_ABI,
      functionName: 'getPendingRewards',
      args: [holder],
    },
    {
      address: tokenAddress,
      abi: TAX_TOKEN_ABI,
      functionName: 'getTotalClaimed',
      args: [holder],
    },
    {
      address: tokenAddress,
      abi: TOKEN_ABI,
      functionName: 'balanceOf',
      args: [holder],
    },
  ]);

  const { data: rawData, isLoading } = useReadContracts({
    contracts: contracts as any,
    query: { enabled: holders.length > 0 },
  });

  const data: HolderRewardInfo[] = useMemo(() => {
    if (!rawData) return [];

    return holders.map((address, i) => {
      const baseIdx = i * 3;
      const pendingRewards = (rawData[baseIdx]?.result as bigint) || 0n;
      const totalClaimed = (rawData[baseIdx + 1]?.result as bigint) || 0n;
      const balance = (rawData[baseIdx + 2]?.result as bigint) || 0n;

      return {
        address,
        balance,
        balancePercent: 0, // Calculate separately with total supply
        pendingRewards,
        totalClaimed,
        lastClaimTime: 0,
        canClaim: pendingRewards > 0n,
      };
    });
  }, [rawData, holders]);

  return { data, isLoading };
}

export default useTaxTokenData;
