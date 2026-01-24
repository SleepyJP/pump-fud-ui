'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { Info, Clock, User, Zap, TrendingUp, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatAddress } from '@/lib/utils';

interface FirstBuyData {
  buyer: `0x${string}`;
  plsSpent: bigint;
  tokensBought: bigint;
  timestamp: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
}

interface TokenStats {
  totalBuys: number;
  totalSells: number;
  uniqueBuyers: number;
  uniqueSellers: number;
  totalVolumePls: bigint;
  averageBuySize: bigint;
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

  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const fetchData = useCallback(async () => {
    if (!tokenAddress || !publicClient) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(100000);

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

      const sortedBuyLogs = [...buyLogs].sort((a, b) => {
        if (a.blockNumber !== b.blockNumber) return Number(a.blockNumber - b.blockNumber);
        return Number(a.logIndex - b.logIndex);
      });

      const firstBuyerSet = new Set<string>();
      const firstBuysData: FirstBuyData[] = [];

      const uniqueBlocks = [...new Set(sortedBuyLogs.slice(0, 20).map(l => l.blockNumber))];
      const blockTimestamps: Record<string, number> = {};

      await Promise.all(
        uniqueBlocks.map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps[bn.toString()] = Number(block.timestamp);
          } catch {
            blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
          }
        })
      );

      for (const log of sortedBuyLogs) {
        const args = log.args as { buyer: `0x${string}`; plsSpent: bigint; tokensBought: bigint };
        if (!args.buyer) continue;

        const buyerLower = args.buyer.toLowerCase();

        if (!firstBuyerSet.has(buyerLower)) {
          firstBuyerSet.add(buyerLower);
          firstBuysData.push({
            buyer: args.buyer,
            plsSpent: args.plsSpent,
            tokensBought: args.tokensBought,
            timestamp: blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000),
            txHash: log.transactionHash,
            blockNumber: log.blockNumber,
          });

          if (firstBuysData.length >= 10) break;
        }
      }

      setFirstBuys(firstBuysData);

      const uniqueBuyers = new Set(buyLogs.map(l => (l.args as { buyer: `0x${string}` }).buyer?.toLowerCase()));
      const uniqueSellers = new Set(sellLogs.map(l => (l.args as { seller: `0x${string}` }).seller?.toLowerCase()));

      let totalVolume = BigInt(0);
      let largestBuy = BigInt(0);
      let largestBuyer: `0x${string}` | null = null;

      for (const log of buyLogs) {
        const args = log.args as { buyer: `0x${string}`; plsSpent: bigint };
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
        if (args.plsReceived) {
          totalVolume += args.plsReceived;
        }
      }

      setStats({
        totalBuys: buyLogs.length,
        totalSells: sellLogs.length,
        uniqueBuyers: uniqueBuyers.size,
        uniqueSellers: uniqueSellers.size,
        totalVolumePls: totalVolume,
        averageBuySize: buyLogs.length > 0 ? totalVolume / BigInt(buyLogs.length) : BigInt(0),
        largestBuy,
        largestBuyer,
      });

    } catch (err) {
      console.error('Failed to fetch token info:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  useEffect(() => {
    if (tokenAddress) {
      fetchData();
    }
  }, [tokenAddress, fetchData]);

  useEffect(() => {
    if (tokenAddress && blockNumber && Number(blockNumber) % 30 === 0) {
      fetchData();
    }
  }, [blockNumber, tokenAddress, fetchData]);

  const formatPls = (amount: bigint): string => {
    const num = Number(formatUnits(amount, 18));
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatTokens = (amount: bigint): string => {
    const num = Number(formatUnits(amount, 18));
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatTime = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const timeAgo = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  return (
    <Card className="h-full flex flex-col" variant="glow">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Info size={18} className="text-fud-purple" />
            <CardTitle>Token Info</CardTitle>
          </div>
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="p-1 hover:bg-dark-tertiary rounded transition-colors"
          >
            <RefreshCw size={14} className={`text-text-muted ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
        <div className="flex gap-2 mt-2">
          <button
            onClick={() => setActiveTab('first')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeTab === 'first'
                ? 'bg-fud-green/20 text-fud-green border border-fud-green/50'
                : 'text-text-muted hover:text-text-primary border border-border-primary'
            }`}
          >
            First Buys
          </button>
          <button
            onClick={() => setActiveTab('stats')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              activeTab === 'stats'
                ? 'bg-fud-purple/20 text-fud-purple border border-fud-purple/50'
                : 'text-text-muted hover:text-text-primary border border-border-primary'
            }`}
          >
            Stats
          </button>
        </div>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Info size={48} className="mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-text-muted text-sm font-mono">Select a token</p>
            </div>
          </div>
        ) : isLoading && firstBuys.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-fud-purple/30 border-t-fud-purple rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-muted text-sm font-mono">Loading...</p>
            </div>
          </div>
        ) : activeTab === 'first' ? (
          <div className="h-full overflow-y-auto space-y-2 pr-1">
            {firstBuys.length === 0 ? (
              <div className="h-full flex items-center justify-center">
                <p className="text-text-muted text-sm font-mono">No buys yet</p>
              </div>
            ) : (
              firstBuys.map((buy, idx) => (
                <div
                  key={buy.txHash}
                  className={`p-2 rounded-lg border transition-colors ${
                    creator && buy.buyer.toLowerCase() === creator.toLowerCase()
                      ? 'bg-fud-orange/10 border-fud-orange/30'
                      : 'bg-dark-tertiary/50 border-border-primary'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-fud-green">#{idx + 1}</span>
                      <a
                        href={`https://scan.pulsechain.com/address/${buy.buyer}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm font-mono text-text-primary hover:text-fud-green flex items-center gap-1"
                      >
                        {formatAddress(buy.buyer)}
                        <ExternalLink size={10} className="opacity-50" />
                      </a>
                      {creator && buy.buyer.toLowerCase() === creator.toLowerCase() && (
                        <span className="text-xs bg-fud-orange/20 text-fud-orange px-1.5 py-0.5 rounded font-mono">
                          DEV
                        </span>
                      )}
                    </div>
                    <a
                      href={`https://scan.pulsechain.com/tx/${buy.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-text-muted hover:text-fud-green"
                    >
                      <ExternalLink size={12} />
                    </a>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-1 text-fud-green">
                      <Zap size={12} />
                      {formatPls(buy.plsSpent)} PLS
                    </div>
                    <div className="text-text-muted">
                      → {formatTokens(buy.tokensBought)} {tokenSymbol || 'tokens'}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-text-muted mt-1">
                    <Clock size={10} />
                    {formatTime(buy.timestamp)} ({timeAgo(buy.timestamp)})
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
                  <div className="p-2 bg-dark-tertiary/50 rounded-lg border border-border-primary">
                    <div className="text-xs text-text-muted font-mono mb-1">Total Buys</div>
                    <div className="text-lg font-display text-fud-green">{stats.totalBuys}</div>
                  </div>
                  <div className="p-2 bg-dark-tertiary/50 rounded-lg border border-border-primary">
                    <div className="text-xs text-text-muted font-mono mb-1">Total Sells</div>
                    <div className="text-lg font-display text-fud-red">{stats.totalSells}</div>
                  </div>
                  <div className="p-2 bg-dark-tertiary/50 rounded-lg border border-border-primary">
                    <div className="text-xs text-text-muted font-mono mb-1">Unique Buyers</div>
                    <div className="text-lg font-display text-text-primary flex items-center gap-1">
                      <User size={14} />
                      {stats.uniqueBuyers}
                    </div>
                  </div>
                  <div className="p-2 bg-dark-tertiary/50 rounded-lg border border-border-primary">
                    <div className="text-xs text-text-muted font-mono mb-1">Unique Sellers</div>
                    <div className="text-lg font-display text-text-primary flex items-center gap-1">
                      <User size={14} />
                      {stats.uniqueSellers}
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-dark-tertiary/50 rounded-lg border border-fud-green/30">
                  <div className="text-xs text-text-muted font-mono mb-1">Total Volume</div>
                  <div className="text-xl font-display text-fud-green">
                    {formatPls(stats.totalVolumePls)} PLS
                  </div>
                </div>

                <div className="p-3 bg-dark-tertiary/50 rounded-lg border border-border-primary">
                  <div className="text-xs text-text-muted font-mono mb-1">Avg Buy Size</div>
                  <div className="text-lg font-display text-text-primary">
                    {formatPls(stats.averageBuySize)} PLS
                  </div>
                </div>

                {stats.largestBuyer && (
                  <div className="p-3 bg-fud-purple/10 rounded-lg border border-fud-purple/30">
                    <div className="text-xs text-text-muted font-mono mb-1 flex items-center gap-1">
                      <TrendingUp size={12} />
                      Largest Buy
                    </div>
                    <div className="text-lg font-display text-fud-purple mb-1">
                      {formatPls(stats.largestBuy)} PLS
                    </div>
                    <a
                      href={`https://scan.pulsechain.com/address/${stats.largestBuyer}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-text-muted hover:text-fud-purple flex items-center gap-1"
                    >
                      {formatAddress(stats.largestBuyer)}
                      <ExternalLink size={10} />
                    </a>
                  </div>
                )}
              </>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
