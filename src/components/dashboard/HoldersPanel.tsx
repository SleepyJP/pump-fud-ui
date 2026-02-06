'use client';

import { useEffect, useState, useCallback, useRef, useMemo } from 'react';
import { usePublicClient, useReadContracts } from 'wagmi';
import { parseAbiItem, formatUnits, type Address } from 'viem';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';
import { Droplet, Gift, TrendingUp, ExternalLink } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Enhanced Holders Panel
// Shows holder balances + rewards for tax tokens
// ═══════════════════════════════════════════════════════════════════════════

interface HolderData {
  address: `0x${string}`;
  balance: bigint;
  percentage: number;
  isCreator: boolean;
  pendingRewards?: bigint;
  totalClaimed?: bigint;
}

interface HoldersPanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  totalSupply?: bigint;
  creator?: `0x${string}`;
  // Tax token props
  isTaxToken?: boolean;
  rewardTokenSymbol?: string;
  rewardTokenDecimals?: number;
}

// ABI for reward functions
const REWARDS_ABI = [
  {
    inputs: [{ name: 'holder', type: 'address' }],
    name: 'getPendingRewards',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
  {
    inputs: [{ name: 'holder', type: 'address' }],
    name: 'getTotalClaimed',
    outputs: [{ type: 'uint256' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export function HoldersPanel({
  tokenAddress,
  tokenSymbol,
  totalSupply,
  creator,
  isTaxToken = false,
  rewardTokenSymbol = 'PLS',
  rewardTokenDecimals = 18,
}: HoldersPanelProps) {
  const [holders, setHolders] = useState<HolderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showRewards, setShowRewards] = useState(isTaxToken);
  const isMountedRef = useRef(true);

  const publicClient = usePublicClient();

  // Build multicall contracts for rewards data
  const rewardContracts = useMemo(() => {
    if (!isTaxToken || !tokenAddress || holders.length === 0) return [];

    return holders.flatMap((holder) => [
      {
        address: tokenAddress,
        abi: REWARDS_ABI,
        functionName: 'getPendingRewards' as const,
        args: [holder.address],
      },
      {
        address: tokenAddress,
        abi: REWARDS_ABI,
        functionName: 'getTotalClaimed' as const,
        args: [holder.address],
      },
    ]);
  }, [isTaxToken, tokenAddress, holders]);

  // Fetch rewards data via multicall
  const { data: rewardsData, refetch: refetchRewards } = useReadContracts({
    contracts: rewardContracts as any,
    query: { enabled: rewardContracts.length > 0 },
  });

  // Merge rewards data into holders
  const holdersWithRewards = useMemo(() => {
    if (!rewardsData || !isTaxToken) return holders;

    return holders.map((holder, index) => {
      const baseIdx = index * 2;
      const pendingRewards = (rewardsData[baseIdx]?.result as bigint) || 0n;
      const totalClaimed = (rewardsData[baseIdx + 1]?.result as bigint) || 0n;

      return {
        ...holder,
        pendingRewards,
        totalClaimed,
      };
    });
  }, [holders, rewardsData, isTaxToken]);

  const fetchHolders = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(500000);

      const logs = await publicClient.getLogs({
        address: tokenAddress,
        event: transferEvent,
        fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
        toBlock: currentBlock,
      });

      if (!isMountedRef.current) return;

      // Build holder balances from transfer events
      const balances = new Map<string, bigint>();
      const ZERO = '0x0000000000000000000000000000000000000000';

      for (const log of logs) {
        const args = log.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
        if (!args.from || !args.to || !args.value) continue;

        const fromAddr = args.from.toLowerCase();
        const toAddr = args.to.toLowerCase();

        if (fromAddr !== ZERO.toLowerCase()) {
          const currentFrom = balances.get(fromAddr) || BigInt(0);
          balances.set(fromAddr, currentFrom - args.value);
        }

        if (toAddr !== ZERO.toLowerCase() && toAddr !== '0x000000000000000000000000000000000000dead') {
          const currentTo = balances.get(toAddr) || BigInt(0);
          balances.set(toAddr, currentTo + args.value);
        }
      }

      if (!isMountedRef.current) return;

      const supply = totalSupply || BigInt(1);
      const holderArray: HolderData[] = [];

      for (const [addr, bal] of balances) {
        if (bal > BigInt(0)) {
          holderArray.push({
            address: addr as `0x${string}`,
            balance: bal,
            percentage: Number((bal * BigInt(10000)) / supply) / 100,
            isCreator: creator?.toLowerCase() === addr.toLowerCase(),
          });
        }
      }

      holderArray.sort((a, b) => Number(b.balance - a.balance));
      setHolders(holderArray.slice(0, 50)); // Increased limit for rewards view
    } catch (err) {
      console.error('[HoldersPanel] Error:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient, totalSupply, creator]);

  useBlockRefresh('holders', fetchHolders, 1, !!tokenAddress);

  useEffect(() => {
    if (tokenAddress) fetchHolders();
  }, [tokenAddress]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // Refetch rewards when holders change
  useEffect(() => {
    if (isTaxToken && holders.length > 0) {
      refetchRewards();
    }
  }, [holders, isTaxToken, refetchRewards]);

  const formatBalance = (balance: bigint | undefined): string => {
    if (!balance) return '0';
    const num = Number(formatUnits(balance, 18));
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatReward = (amount: bigint | undefined, decimals: number = 18): string => {
    if (!amount || amount === 0n) return '-';
    const num = Number(formatUnits(amount, decimals));
    if (num < 0.0001) return '< 0.0001';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(4);
  };

  const formatShortAddr = (addr: string): string => {
    return '@' + addr.slice(2, 8).toLowerCase();
  };

  // Calculate totals for header
  const totalPendingRewards = useMemo(() => {
    if (!isTaxToken) return 0n;
    return holdersWithRewards.reduce((sum, h) => sum + (h.pendingRewards || 0n), 0n);
  }, [holdersWithRewards, isTaxToken]);

  return (
    <div className="h-full flex flex-col bg-black">
      {/* Header */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Droplet size={16} className="text-cyan-400" />
            <span className="text-white font-semibold">Holders: {holdersWithRewards.length}</span>
          </div>

          {/* Toggle rewards view for tax tokens */}
          {isTaxToken && (
            <button
              onClick={() => setShowRewards(!showRewards)}
              className={`flex items-center gap-1 px-2 py-1 rounded text-[10px] font-mono transition-all ${
                showRewards
                  ? 'bg-[#d6ffe0]/20 text-[#d6ffe0] border border-[#d6ffe0]/30'
                  : 'bg-gray-800 text-gray-400 border border-gray-700'
              }`}
            >
              <Gift size={10} />
              REWARDS
            </button>
          )}
        </div>

        {/* Rewards summary for tax tokens */}
        {isTaxToken && showRewards && totalPendingRewards > 0n && (
          <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-400">
            <TrendingUp size={10} className="text-[#d6ffe0]" />
            <span>
              Total Pending: <span className="text-[#d6ffe0] font-mono">{formatReward(totalPendingRewards, rewardTokenDecimals)} {rewardTokenSymbol}</span>
            </span>
          </div>
        )}
      </div>

      {/* Column Headers for tax tokens */}
      {isTaxToken && showRewards && holdersWithRewards.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-800 bg-gray-900/50 flex items-center text-[10px] text-gray-500 uppercase font-mono">
          <div className="flex-1">Holder</div>
          <div className="w-24 text-right">Balance</div>
          <div className="w-24 text-right text-[#d6ffe0]">Pending</div>
          <div className="w-20 text-right text-purple-400">Claimed</div>
        </div>
      )}

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">Select a token</p>
          </div>
        ) : isLoading && holders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-gray-700 border-t-cyan-400 rounded-full animate-spin" />
          </div>
        ) : holdersWithRewards.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-500 text-sm">No holders found</p>
          </div>
        ) : isTaxToken && showRewards ? (
          /* Tax Token Rewards View */
          <div className="py-1">
            {holdersWithRewards.map((holder, index) => (
              <a
                key={holder.address}
                href={`https://scan.pulsechain.com/address/${holder.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center px-4 py-2 hover:bg-gray-900/50 transition-colors group"
              >
                {/* Holder Address */}
                <div className="flex-1 flex items-center gap-2 min-w-0">
                  {index === 0 ? (
                    <Droplet size={12} className="text-cyan-400 flex-shrink-0" />
                  ) : (
                    <span className="w-3 flex-shrink-0 text-[10px] text-gray-600 font-mono">
                      {index + 1}
                    </span>
                  )}
                  <span className={`text-xs font-mono truncate ${index === 0 ? 'text-cyan-400' : 'text-gray-300'}`}>
                    {formatShortAddr(holder.address)}
                    {holder.isCreator && (
                      <span className="ml-1 text-purple-400 text-[10px]">(dev)</span>
                    )}
                  </span>
                  <ExternalLink size={10} className="text-gray-600 opacity-0 group-hover:opacity-100 flex-shrink-0" />
                </div>

                {/* Balance */}
                <div className="w-24 text-right">
                  <span className="text-xs text-gray-400 font-mono">
                    {formatBalance(holder.balance)}
                  </span>
                  <span className="text-[10px] text-gray-600 ml-1">
                    ({holder.percentage.toFixed(1)}%)
                  </span>
                </div>

                {/* Pending Rewards */}
                <div className="w-24 text-right">
                  <span className={`text-xs font-mono ${
                    holder.pendingRewards && holder.pendingRewards > 0n
                      ? 'text-[#d6ffe0]'
                      : 'text-gray-600'
                  }`}>
                    {formatReward(holder.pendingRewards, rewardTokenDecimals)}
                  </span>
                </div>

                {/* Total Claimed */}
                <div className="w-20 text-right">
                  <span className={`text-xs font-mono ${
                    holder.totalClaimed && holder.totalClaimed > 0n
                      ? 'text-purple-400'
                      : 'text-gray-600'
                  }`}>
                    {formatReward(holder.totalClaimed, rewardTokenDecimals)}
                  </span>
                </div>
              </a>
            ))}
          </div>
        ) : (
          /* Standard View (non-tax or rewards hidden) */
          <div className="py-1">
            {holdersWithRewards.map((holder, index) => (
              <a
                key={holder.address}
                href={`https://scan.pulsechain.com/address/${holder.address}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-between px-4 py-2 hover:bg-gray-900/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  {index === 0 ? (
                    <Droplet size={14} className="text-cyan-400" />
                  ) : (
                    <span className="w-[14px]" />
                  )}
                  <span className={`text-sm font-mono ${index === 0 ? 'text-cyan-400' : 'text-gray-300'}`}>
                    {formatShortAddr(holder.address)}
                    {holder.isCreator && (
                      <span className="ml-1 text-purple-400 text-xs">(dev)</span>
                    )}
                  </span>
                </div>

                <span className="text-sm text-gray-400">
                  {formatBalance(holder.balance)} ({holder.percentage.toFixed(2)}%)
                </span>
              </a>
            ))}
          </div>
        )}
      </div>

      {/* Footer for tax tokens */}
      {isTaxToken && showRewards && (
        <div className="px-4 py-2 border-t border-gray-800 bg-gray-900/30">
          <p className="text-[10px] text-gray-500 text-center">
            Rewards in <span className="text-[#d6ffe0]">{rewardTokenSymbol}</span> • Click holder to view on explorer
          </p>
        </div>
      )}
    </div>
  );
}

export default HoldersPanel;
