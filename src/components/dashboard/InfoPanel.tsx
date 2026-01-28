'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';
import { Info, Trophy, Users, Zap, ExternalLink, Crown } from 'lucide-react';
import { formatAddress } from '@/lib/utils';

interface FirstBuyData {
  buyer: `0x${string}`;
  plsSpent: bigint;
  tokensBought: bigint;
  rank: number;
}

interface TokenStats {
  totalBuys: number;
  totalSells: number;
  uniqueBuyers: number;
  totalVolumePls: bigint;
  largestBuy: bigint;
  largestBuyer: `0x${string}` | null;
}

interface InfoPanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  creator?: `0x${string}`;
}

export function InfoPanel({ tokenAddress, tokenSymbol, creator }: InfoPanelProps) {
  const [firstBuys, setFirstBuys] = useState<FirstBuyData[]>([]);
  const [stats, setStats] = useState<TokenStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'first' | 'stats'>('first');
  const isMountedRef = useRef(true);

  const publicClient = usePublicClient();

  const fetchData = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(30000);

      const [buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({
          address: tokenAddress,
          event: buyEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
        publicClient.getLogs({
          address: tokenAddress,
          event: sellEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
      ]);

      if (!isMountedRef.current) return;

      // Sort by block/index to get first buyers
      const sortedBuyLogs = [...buyLogs].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
        return Number(a.logIndex - b.logIndex);
      });

      const firstBuyerSet = new Set<string>();
      const firstBuysData: FirstBuyData[] = [];
      let rank = 1;

      for (const log of sortedBuyLogs) {
        const args = log.args as { buyer: `0x${string}`; plsSpent: bigint; tokensBought: bigint };
        if (args.buyer && !firstBuyerSet.has(args.buyer.toLowerCase())) {
          firstBuyerSet.add(args.buyer.toLowerCase());
          firstBuysData.push({
            buyer: args.buyer,
            plsSpent: args.plsSpent,
            tokensBought: args.tokensBought,
            rank: rank++,
          });
          if (rank > 10) break;
        }
      }

      // Calculate stats
      const uniqueBuyers = new Set<string>();
      let totalVolume = BigInt(0);
      let largestBuy = BigInt(0);
      let largestBuyer: `0x${string}` | null = null;

      for (const log of buyLogs) {
        const args = log.args as { buyer: `0x${string}`; plsSpent: bigint };
        if (args.buyer) uniqueBuyers.add(args.buyer.toLowerCase());
        if (args.plsSpent) {
          totalVolume += args.plsSpent;
          if (args.plsSpent > largestBuy) {
            largestBuy = args.plsSpent;
            largestBuyer = args.buyer;
          }
        }
      }

      for (const log of sellLogs) {
        const args = log.args as { plsReceived: bigint };
        if (args.plsReceived) totalVolume += args.plsReceived;
      }

      if (!isMountedRef.current) return;

      setFirstBuys(firstBuysData);
      setStats({
        totalBuys: buyLogs.length,
        totalSells: sellLogs.length,
        uniqueBuyers: uniqueBuyers.size,
        totalVolumePls: totalVolume,
        largestBuy,
        largestBuyer,
      });
    } catch (err) {
      console.error('[InfoPanel] Error:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Use shared block refresh
  useBlockRefresh('info', fetchData, 30, !!tokenAddress);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) fetchData();
  }, [tokenAddress]); // fetchData intentionally excluded

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const formatPls = (amount: bigint): string => {
    const num = Number(formatUnits(amount, 18));
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return <Crown size={14} className="text-yellow-400" />;
    if (rank === 2) return <Crown size={14} className="text-gray-300" />;
    if (rank === 3) return <Crown size={14} className="text-amber-600" />;
    return <span className="text-[10px] font-bold text-text-muted">#{rank}</span>;
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
        <div className="flex items-center gap-2">
          <Info size={18} className="text-fud-green" />
          <span className="font-display text-sm text-fud-green">TOKEN INFO</span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-fud-green/10">
        <button
          onClick={() => setActiveTab('first')}
          className={`flex-1 py-2 text-xs font-mono flex items-center justify-center gap-1 transition-all ${
            activeTab === 'first'
              ? 'text-fud-green border-b-2 border-fud-green bg-fud-green/10'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Trophy size={12} />
          First Buyers
        </button>
        <button
          onClick={() => setActiveTab('stats')}
          className={`flex-1 py-2 text-xs font-mono flex items-center justify-center gap-1 transition-all ${
            activeTab === 'stats'
              ? 'text-fud-green border-b-2 border-fud-green bg-fud-green/10'
              : 'text-text-muted hover:text-text-primary'
          }`}
        >
          <Zap size={12} />
          Stats
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-3">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Info size={32} className="mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-text-muted text-xs font-mono">Select a token</p>
            </div>
          </div>
        ) : isLoading && firstBuys.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin" />
          </div>
        ) : activeTab === 'first' ? (
          <div className="space-y-2">
            {firstBuys.length === 0 ? (
              <p className="text-center text-text-muted text-xs font-mono py-4">No buyers yet</p>
            ) : (
              firstBuys.map((fb) => (
                <div
                  key={fb.buyer}
                  className={`flex items-center gap-2 p-2 rounded-lg transition-all ${
                    fb.rank <= 3 ? 'bg-fud-green/10 border border-fud-green/20' : 'bg-dark-tertiary/50'
                  }`}
                >
                  <div className="w-6 flex items-center justify-center">
                    {getRankIcon(fb.rank)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <a
                      href={`https://scan.pulsechain.com/address/${fb.buyer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-fud-green hover:underline flex items-center gap-1"
                    >
                      {formatAddress(fb.buyer)}
                      <ExternalLink size={10} />
                    </a>
                    <p className="text-[10px] font-mono text-text-muted">
                      {formatPls(fb.plsSpent)} PLS
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        ) : (
          <div className="space-y-3">
            {stats && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-dark-tertiary/50 p-3 rounded-lg">
                    <p className="text-[10px] font-mono text-text-muted mb-1">Total Buys</p>
                    <p className="text-lg font-display text-fud-green">{stats.totalBuys}</p>
                  </div>
                  <div className="bg-dark-tertiary/50 p-3 rounded-lg">
                    <p className="text-[10px] font-mono text-text-muted mb-1">Total Sells</p>
                    <p className="text-lg font-display text-orange-400">{stats.totalSells}</p>
                  </div>
                  <div className="bg-dark-tertiary/50 p-3 rounded-lg">
                    <p className="text-[10px] font-mono text-text-muted mb-1">Unique Buyers</p>
                    <p className="text-lg font-display text-text-primary">{stats.uniqueBuyers}</p>
                  </div>
                  <div className="bg-dark-tertiary/50 p-3 rounded-lg">
                    <p className="text-[10px] font-mono text-text-muted mb-1">Volume</p>
                    <p className="text-lg font-display text-text-primary">{formatPls(stats.totalVolumePls)}</p>
                  </div>
                </div>
                {stats.largestBuyer && (
                  <div className="bg-fud-green/10 border border-fud-green/20 p-3 rounded-lg">
                    <p className="text-[10px] font-mono text-fud-green mb-1 flex items-center gap-1">
                      <Crown size={12} /> Biggest Buy
                    </p>
                    <p className="text-sm font-mono text-text-primary">{formatPls(stats.largestBuy)} PLS</p>
                    <a
                      href={`https://scan.pulsechain.com/address/${stats.largestBuyer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-mono text-fud-green hover:underline"
                    >
                      {formatAddress(stats.largestBuyer)}
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
