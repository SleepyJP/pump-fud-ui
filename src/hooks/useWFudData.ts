'use client';

import { useMemo } from 'react';
import { useReadContracts, useAccount } from 'wagmi';
import { type Address, formatEther } from 'viem';
import { WFUD_ADDRESS, WFUD_ABI, ERC20_METADATA_ABI } from '@/config/wfudAbi';
import { getTokenDisplay, type YieldTokenDisplay } from '@/config/wfudTokens';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - wFUD Data Hook
// Chained multicall batches for ForgedTaxTokenV3 on-chain reads
// ═══════════════════════════════════════════════════════════════════════════

export interface YieldTokenInfo {
  address: Address;
  share: bigint;
  name: string;
  symbol: string;
  decimals: number;
  totalDistributed: bigint;
  display: YieldTokenDisplay;
}

export interface HolderInfo {
  address: Address;
  balance: bigint;
  percent: number;
}

export interface UseWFudDataResult {
  // Token info
  name: string;
  symbol: string;
  totalSupply: bigint;
  decimals: number;

  // Tax config
  buyTax: bigint;
  sellTax: bigint;
  transferTax: bigint;

  // Share distribution
  treasuryShare: bigint;
  burnShare: bigint;
  reflectionShare: bigint;
  liquidityShare: bigint;
  yieldShare: bigint;
  supportShare: bigint;

  // Stats
  holderCount: number;
  totalReflected: bigint;
  tradingEnabled: boolean;
  swapEnabled: boolean;
  pairAddress: Address | null;

  // Yield tokens (6 reward tokens)
  yieldTokens: YieldTokenInfo[];
  yieldTokensCount: number;

  // User position (when wallet connected)
  userBalance: bigint;
  userPercent: number;
  pendingRewards: { token: Address; amount: bigint; symbol: string; decimals: number }[];

  // Holder leaderboard
  holders: HolderInfo[];

  // Loading states
  isLoading: boolean;
  isLoadingHolders: boolean;
  isLoadingUser: boolean;
}

export function useWFudData(): UseWFudDataResult {
  const { address: userAddress } = useAccount();

  // ═══════════════════════════════════════════════════════════════════════
  // BATCH 1: Static token data
  // ═══════════════════════════════════════════════════════════════════════
  const batch1Contracts = [
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'name' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'symbol' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'totalSupply' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'decimals' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'buyTax' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'sellTax' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'transferTax' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'treasuryShare' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'burnShare' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'reflectionShare' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'liquidityShare' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'yieldShare' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'supportShare' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'getHolderCount' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'getYieldTokensCount' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'pair' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'tradingEnabled' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'swapEnabled' },
    { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'totalReflected' },
  ] as const;

  const { data: batch1, isLoading: isLoadingBatch1 } = useReadContracts({
    contracts: batch1Contracts as any,
    query: { refetchInterval: 30_000 },
  });

  const name = (batch1?.[0]?.result as string) || 'wFUD';
  const symbol = (batch1?.[1]?.result as string) || 'wFUD';
  const totalSupply = (batch1?.[2]?.result as bigint) || 0n;
  const decimals = Number((batch1?.[3]?.result as bigint) || 18n);
  const buyTax = (batch1?.[4]?.result as bigint) || 0n;
  const sellTax = (batch1?.[5]?.result as bigint) || 0n;
  const transferTax = (batch1?.[6]?.result as bigint) || 0n;
  const treasuryShare = (batch1?.[7]?.result as bigint) || 0n;
  const burnShare = (batch1?.[8]?.result as bigint) || 0n;
  const reflectionShare = (batch1?.[9]?.result as bigint) || 0n;
  const liquidityShare = (batch1?.[10]?.result as bigint) || 0n;
  const yieldShare = (batch1?.[11]?.result as bigint) || 0n;
  const supportShare = (batch1?.[12]?.result as bigint) || 0n;
  const holderCount = Number((batch1?.[13]?.result as bigint) || 0n);
  const yieldTokensCount = Number((batch1?.[14]?.result as bigint) || 0n);
  const pairAddress = (batch1?.[15]?.result as Address) || null;
  const tradingEnabled = (batch1?.[16]?.result as boolean) || false;
  const swapEnabled = (batch1?.[17]?.result as boolean) || false;
  const totalReflected = (batch1?.[18]?.result as bigint) || 0n;

  // ═══════════════════════════════════════════════════════════════════════
  // BATCH 2: Yield token addresses + shares + totalDistributed
  // ═══════════════════════════════════════════════════════════════════════
  const batch2Contracts = useMemo(() => {
    if (yieldTokensCount === 0) return [];
    const contracts: any[] = [];
    for (let i = 0; i < yieldTokensCount; i++) {
      contracts.push({
        address: WFUD_ADDRESS,
        abi: WFUD_ABI,
        functionName: 'yieldTokens',
        args: [BigInt(i)],
      });
    }
    return contracts;
  }, [yieldTokensCount]);

  const { data: batch2 } = useReadContracts({
    contracts: batch2Contracts as any,
    query: {
      enabled: yieldTokensCount > 0,
      refetchInterval: 30_000,
    },
  });

  // Extract yield token addresses from batch 2
  const yieldTokenAddresses = useMemo(() => {
    if (!batch2) return [];
    return batch2.map((r) => {
      const result = r.result as any;
      if (!result) return null;
      // yieldTokens returns (address addr, uint256 share)
      // Could be tuple array [addr, share] or object { addr, share }
      const addr = Array.isArray(result) ? result[0] : result.addr || result[0];
      const share = Array.isArray(result) ? result[1] : result.share || result[1];
      return { address: addr as Address, share: (share as bigint) || 0n };
    }).filter((t): t is { address: Address; share: bigint } => t !== null && t.address !== undefined);
  }, [batch2]);

  // ═══════════════════════════════════════════════════════════════════════
  // BATCH 3: ERC20 metadata for each yield token + totalYieldDistributed
  // ═══════════════════════════════════════════════════════════════════════
  const batch3Contracts = useMemo(() => {
    if (yieldTokenAddresses.length === 0) return [];
    const contracts: any[] = [];
    for (const yt of yieldTokenAddresses) {
      contracts.push(
        { address: yt.address, abi: ERC20_METADATA_ABI, functionName: 'name' },
        { address: yt.address, abi: ERC20_METADATA_ABI, functionName: 'symbol' },
        { address: yt.address, abi: ERC20_METADATA_ABI, functionName: 'decimals' },
        { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'totalYieldDistributed', args: [yt.address] },
      );
    }
    return contracts;
  }, [yieldTokenAddresses]);

  const { data: batch3 } = useReadContracts({
    contracts: batch3Contracts as any,
    query: {
      enabled: yieldTokenAddresses.length > 0,
      refetchInterval: 30_000,
    },
  });

  // Build yield token info array
  const yieldTokens: YieldTokenInfo[] = useMemo(() => {
    if (yieldTokenAddresses.length === 0 || !batch3) return [];
    return yieldTokenAddresses.map((yt, i) => {
      const base = i * 4;
      const onChainName = batch3[base]?.result as string;
      const onChainSymbol = batch3[base + 1]?.result as string;
      const onChainDecimals = batch3[base + 2]?.result;
      const totalDistributed = (batch3[base + 3]?.result as bigint) || 0n;

      const display = getTokenDisplay(yt.address);
      return {
        address: yt.address,
        share: yt.share,
        name: onChainName || display.name,
        symbol: onChainSymbol || display.symbol,
        decimals: Number(onChainDecimals ?? 18),
        totalDistributed,
        display: {
          ...display,
          name: onChainName || display.name,
          symbol: onChainSymbol || display.symbol,
        },
      };
    });
  }, [yieldTokenAddresses, batch3]);

  // ═══════════════════════════════════════════════════════════════════════
  // BATCH 4: User data (wallet connected)
  // ═══════════════════════════════════════════════════════════════════════
  const batch4Contracts = useMemo(() => {
    if (!userAddress || yieldTokenAddresses.length === 0) return [];
    const contracts: any[] = [
      { address: WFUD_ADDRESS, abi: WFUD_ABI, functionName: 'balanceOf', args: [userAddress] },
    ];
    for (const yt of yieldTokenAddresses) {
      contracts.push({
        address: WFUD_ADDRESS,
        abi: WFUD_ABI,
        functionName: 'pendingYieldReward',
        args: [userAddress, yt.address],
      });
    }
    return contracts;
  }, [userAddress, yieldTokenAddresses]);

  const { data: batch4, isLoading: isLoadingUser } = useReadContracts({
    contracts: batch4Contracts as any,
    query: {
      enabled: !!userAddress && yieldTokenAddresses.length > 0,
      refetchInterval: 15_000,
    },
  });

  const userBalance = (batch4?.[0]?.result as bigint) || 0n;
  const userPercent = totalSupply > 0n
    ? Number((userBalance * 10000n) / totalSupply) / 100
    : 0;

  const pendingRewards = useMemo(() => {
    if (!batch4 || yieldTokenAddresses.length === 0) return [];
    return yieldTokenAddresses.map((yt, i) => {
      const ytInfo = yieldTokens[i];
      return {
        token: yt.address,
        amount: (batch4[i + 1]?.result as bigint) || 0n,
        symbol: ytInfo?.symbol || '???',
        decimals: ytInfo?.decimals || 18,
      };
    });
  }, [batch4, yieldTokenAddresses, yieldTokens]);

  // ═══════════════════════════════════════════════════════════════════════
  // BATCH 5: Top 50 holders
  // ═══════════════════════════════════════════════════════════════════════
  const holderLimit = Math.min(holderCount, 50);

  const batch5aContracts = useMemo(() => {
    if (holderLimit === 0) return [];
    const contracts: any[] = [];
    for (let i = 0; i < holderLimit; i++) {
      contracts.push({
        address: WFUD_ADDRESS,
        abi: WFUD_ABI,
        functionName: 'getHolder',
        args: [BigInt(i)],
      });
    }
    return contracts;
  }, [holderLimit]);

  const { data: batch5a, isLoading: isLoadingHolderAddrs } = useReadContracts({
    contracts: batch5aContracts as any,
    query: {
      enabled: holderLimit > 0,
      refetchInterval: 60_000,
    },
  });

  const holderAddresses = useMemo(() => {
    if (!batch5a) return [];
    return batch5a
      .map((r) => r.result as Address)
      .filter((a): a is Address => !!a);
  }, [batch5a]);

  // Batch 5b: balanceOf for each holder
  const batch5bContracts = useMemo(() => {
    if (holderAddresses.length === 0) return [];
    return holderAddresses.map((addr) => ({
      address: WFUD_ADDRESS,
      abi: WFUD_ABI,
      functionName: 'balanceOf',
      args: [addr],
    }));
  }, [holderAddresses]);

  const { data: batch5b, isLoading: isLoadingHolderBals } = useReadContracts({
    contracts: batch5bContracts as any,
    query: {
      enabled: holderAddresses.length > 0,
      refetchInterval: 60_000,
    },
  });

  const holders: HolderInfo[] = useMemo(() => {
    if (holderAddresses.length === 0 || !batch5b) return [];
    const list = holderAddresses.map((addr, i) => {
      const balance = (batch5b[i]?.result as bigint) || 0n;
      const percent = totalSupply > 0n
        ? Number((balance * 10000n) / totalSupply) / 100
        : 0;
      return { address: addr, balance, percent };
    });
    return list.sort((a, b) => (a.balance > b.balance ? -1 : 1));
  }, [holderAddresses, batch5b, totalSupply]);

  return {
    name,
    symbol,
    totalSupply,
    decimals,
    buyTax,
    sellTax,
    transferTax,
    treasuryShare,
    burnShare,
    reflectionShare,
    liquidityShare,
    yieldShare,
    supportShare,
    holderCount,
    totalReflected,
    tradingEnabled,
    swapEnabled,
    pairAddress,
    yieldTokens,
    yieldTokensCount,
    userBalance,
    userPercent,
    pendingRewards,
    holders,
    isLoading: isLoadingBatch1,
    isLoadingHolders: isLoadingHolderAddrs || isLoadingHolderBals,
    isLoadingUser,
  };
}
