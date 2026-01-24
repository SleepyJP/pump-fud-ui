'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { Users, TrendingUp, TrendingDown, ExternalLink, RefreshCw } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { formatAddress } from '@/lib/utils';

interface HolderData {
  address: `0x${string}`;
  balance: bigint;
  percentage: number;
  firstBuyTimestamp: number;
  lastActivityTimestamp: number;
  totalBought: bigint;
  totalSold: bigint;
  pnlPls: bigint;
  isCreator: boolean;
}

interface HoldersPanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  totalSupply?: bigint;
  creator?: `0x${string}`;
}

export function HoldersPanel({ tokenAddress, tokenSymbol, totalSupply, creator }: HoldersPanelProps) {
  const [holders, setHolders] = useState<HolderData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);
  const [sortBy, setSortBy] = useState<'balance' | 'pnl' | 'recent'>('balance');

  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const fetchHolders = useCallback(async () => {
    if (!tokenAddress || !publicClient) return;

    setIsLoading(true);
    try {
      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(100000);

      const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const [transferLogs, buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({
          address: tokenAddress,
          event: transferEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
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

      const holderMap = new Map<string, {
        balance: bigint;
        totalBought: bigint;
        totalSold: bigint;
        plsSpent: bigint;
        plsReceived: bigint;
        firstBlock: bigint;
        lastBlock: bigint;
      }>();

      for (const log of transferLogs) {
        const args = log.args as { from: `0x${string}`; to: `0x${string}`; value: bigint };
        if (!args.from || !args.to || args.value === undefined) continue;

        const fromAddr = args.from.toLowerCase();
        const toAddr = args.to.toLowerCase();
        const value = args.value;

        if (fromAddr !== '0x0000000000000000000000000000000000000000') {
          const existing = holderMap.get(fromAddr) || {
            balance: BigInt(0),
            totalBought: BigInt(0),
            totalSold: BigInt(0),
            plsSpent: BigInt(0),
            plsReceived: BigInt(0),
            firstBlock: log.blockNumber,
            lastBlock: log.blockNumber,
          };
          existing.balance -= value;
          existing.lastBlock = log.blockNumber;
          holderMap.set(fromAddr, existing);
        }

        if (toAddr !== '0x0000000000000000000000000000000000000000') {
          const existing = holderMap.get(toAddr) || {
            balance: BigInt(0),
            totalBought: BigInt(0),
            totalSold: BigInt(0),
            plsSpent: BigInt(0),
            plsReceived: BigInt(0),
            firstBlock: log.blockNumber,
            lastBlock: log.blockNumber,
          };
          existing.balance += value;
          if (existing.firstBlock > log.blockNumber) existing.firstBlock = log.blockNumber;
          existing.lastBlock = log.blockNumber;
          holderMap.set(toAddr, existing);
        }
      }

      for (const log of buyLogs) {
        const args = log.args as { buyer: `0x${string}`; plsSpent: bigint; tokensBought: bigint };
        if (!args.buyer) continue;
        const addr = args.buyer.toLowerCase();
        const existing = holderMap.get(addr);
        if (existing) {
          existing.totalBought += args.tokensBought || BigInt(0);
          existing.plsSpent += args.plsSpent || BigInt(0);
        }
      }

      for (const log of sellLogs) {
        const args = log.args as { seller: `0x${string}`; tokensSold: bigint; plsReceived: bigint };
        if (!args.seller) continue;
        const addr = args.seller.toLowerCase();
        const existing = holderMap.get(addr);
        if (existing) {
          existing.totalSold += args.tokensSold || BigInt(0);
          existing.plsReceived += args.plsReceived || BigInt(0);
        }
      }

      const blockTimestamps: Record<string, number> = {};
      const uniqueBlocks = [...new Set([...holderMap.values()].flatMap(h => [h.firstBlock, h.lastBlock]))];

      await Promise.all(
        uniqueBlocks.slice(0, 50).map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps[bn.toString()] = Number(block.timestamp);
          } catch {
            blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
          }
        })
      );

      const supply = totalSupply || BigInt(1000000000) * BigInt(10 ** 18);

      const holdersArray: HolderData[] = [];

      for (const [addr, data] of holderMap.entries()) {
        if (data.balance <= BigInt(0)) continue;

        const percentage = Number((data.balance * BigInt(10000)) / supply) / 100;
        const pnlPls = data.plsReceived - data.plsSpent;

        holdersArray.push({
          address: addr as `0x${string}`,
          balance: data.balance,
          percentage,
          firstBuyTimestamp: blockTimestamps[data.firstBlock.toString()] || Math.floor(Date.now() / 1000),
          lastActivityTimestamp: blockTimestamps[data.lastBlock.toString()] || Math.floor(Date.now() / 1000),
          totalBought: data.totalBought,
          totalSold: data.totalSold,
          pnlPls,
          isCreator: creator ? addr.toLowerCase() === creator.toLowerCase() : false,
        });
      }

      holdersArray.sort((a, b) => {
        if (sortBy === 'balance') return Number(b.balance - a.balance);
        if (sortBy === 'pnl') return Number(b.pnlPls - a.pnlPls);
        return b.lastActivityTimestamp - a.lastActivityTimestamp;
      });

      setHolders(holdersArray.slice(0, 50));
      setLastRefresh(new Date());
    } catch (err) {
      console.error('Failed to fetch holders:', err);
    } finally {
      setIsLoading(false);
    }
  }, [tokenAddress, publicClient, totalSupply, creator, sortBy]);

  useEffect(() => {
    if (tokenAddress) {
      fetchHolders();
    }
  }, [tokenAddress, fetchHolders]);

  useEffect(() => {
    if (tokenAddress && blockNumber && Number(blockNumber) % 20 === 0) {
      fetchHolders();
    }
  }, [blockNumber, tokenAddress, fetchHolders]);

  const formatBalance = (balance: bigint): string => {
    const num = Number(formatUnits(balance, 18));
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatPnl = (pnl: bigint): string => {
    const num = Number(formatUnits(pnl, 18));
    const prefix = num >= 0 ? '+' : '';
    if (Math.abs(num) >= 1_000_000) return prefix + (num / 1_000_000).toFixed(2) + 'M';
    if (Math.abs(num) >= 1_000) return prefix + (num / 1_000).toFixed(2) + 'K';
    return prefix + num.toFixed(2);
  };

  const formatTime = (timestamp: number): string => {
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
            <Users size={18} className="text-fud-green" />
            <CardTitle>Top Holders</CardTitle>
            <span className="text-xs text-text-muted font-mono">({holders.length})</span>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as 'balance' | 'pnl' | 'recent')}
              className="text-xs font-mono bg-dark-tertiary border border-border-primary rounded px-2 py-1 text-text-secondary"
            >
              <option value="balance">By Balance</option>
              <option value="pnl">By PnL</option>
              <option value="recent">Recent</option>
            </select>
            <button
              onClick={fetchHolders}
              disabled={isLoading}
              className="p-1 hover:bg-dark-tertiary rounded transition-colors"
              title="Refresh"
            >
              <RefreshCw size={14} className={`text-text-muted ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
        {lastRefresh && (
          <p className="text-xs text-text-muted font-mono">
            Updated {formatTime(Math.floor(lastRefresh.getTime() / 1000))}
          </p>
        )}
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-text-muted text-sm font-mono">Select a token</p>
            </div>
          </div>
        ) : isLoading && holders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-2" />
              <p className="text-text-muted text-sm font-mono">Loading holders...</p>
            </div>
          </div>
        ) : holders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Users size={48} className="mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-text-muted text-sm font-mono">No holders yet</p>
            </div>
          </div>
        ) : (
          <div className="h-full overflow-y-auto space-y-1 pr-1">
            {holders.map((holder, idx) => (
              <div
                key={holder.address}
                className={`p-2 rounded-lg border transition-colors ${
                  holder.isCreator
                    ? 'bg-fud-purple/10 border-fud-purple/30'
                    : 'bg-dark-tertiary/50 border-border-primary hover:border-fud-green/30'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-text-muted w-5">#{idx + 1}</span>
                    <a
                      href={`https://scan.pulsechain.com/address/${holder.address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm font-mono text-fud-green hover:underline flex items-center gap-1"
                    >
                      {formatAddress(holder.address)}
                      <ExternalLink size={10} className="opacity-50" />
                    </a>
                    {holder.isCreator && (
                      <span className="text-xs bg-fud-purple/20 text-fud-purple px-1.5 py-0.5 rounded font-mono">
                        CREATOR
                      </span>
                    )}
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-mono text-text-primary">
                      {formatBalance(holder.balance)} {tokenSymbol || 'tokens'}
                    </div>
                    <div className="text-xs font-mono text-text-muted">
                      {holder.percentage.toFixed(2)}%
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-1 text-xs font-mono">
                  <span className="text-text-muted">
                    First: {formatTime(holder.firstBuyTimestamp)}
                  </span>
                  <div className={`flex items-center gap-1 ${
                    holder.pnlPls >= BigInt(0) ? 'text-fud-green' : 'text-fud-red'
                  }`}>
                    {holder.pnlPls >= BigInt(0) ? (
                      <TrendingUp size={12} />
                    ) : (
                      <TrendingDown size={12} />
                    )}
                    {formatPnl(holder.pnlPls)} PLS
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
