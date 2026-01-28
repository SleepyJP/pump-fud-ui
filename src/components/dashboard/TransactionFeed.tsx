'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';
import { ArrowUpRight, ArrowDownRight, Activity, ExternalLink } from 'lucide-react';
import { formatAddress } from '@/lib/utils';

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  trader: `0x${string}`;
  plsAmount: bigint;
  tokenAmount: bigint;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

interface TransactionFeedProps {
  tokenAddress?: `0x${string}`;
}

export function TransactionFeed({ tokenAddress }: TransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const isMountedRef = useRef(true);
  const seenTxsRef = useRef(new Set<string>());

  const publicClient = usePublicClient();

  const fetchTransactions = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(10000); // ~8 hours

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

      // Get block timestamps for recent blocks
      const uniqueBlocks = [...new Set([...buyLogs, ...sellLogs].map(l => l.blockNumber))];
      const blockTimestamps: Record<string, number> = {};

      await Promise.all(
        uniqueBlocks.slice(-30).map(async (bn) => {
          try {
            const block = await publicClient.getBlock({ blockNumber: bn });
            blockTimestamps[bn.toString()] = Number(block.timestamp);
          } catch {
            blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
          }
        })
      );

      if (!isMountedRef.current) return;

      const allTxs: Transaction[] = [];

      for (const log of buyLogs) {
        const args = log.args as { buyer: `0x${string}`; plsSpent: bigint; tokensBought: bigint };
        const id = `${log.transactionHash}-${log.logIndex}`;
        if (seenTxsRef.current.has(id)) continue;
        seenTxsRef.current.add(id);

        allTxs.push({
          id,
          type: 'buy',
          trader: args.buyer,
          plsAmount: args.plsSpent,
          tokenAmount: args.tokensBought,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000),
        });
      }

      for (const log of sellLogs) {
        const args = log.args as { seller: `0x${string}`; tokensSold: bigint; plsReceived: bigint };
        const id = `${log.transactionHash}-${log.logIndex}`;
        if (seenTxsRef.current.has(id)) continue;
        seenTxsRef.current.add(id);

        allTxs.push({
          id,
          type: 'sell',
          trader: args.seller,
          plsAmount: args.plsReceived,
          tokenAmount: args.tokensSold,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber,
          timestamp: blockTimestamps[log.blockNumber.toString()] || Math.floor(Date.now() / 1000),
        });
      }

      // Sort by block (newest first) and merge with existing
      allTxs.sort((a, b) => Number(b.blockNumber - a.blockNumber));

      setTransactions(prev => {
        const merged = [...allTxs, ...prev];
        const unique = merged.filter((tx, i, arr) => arr.findIndex(t => t.id === tx.id) === i);
        unique.sort((a, b) => Number(b.blockNumber - a.blockNumber));
        return unique.slice(0, 50);
      });
    } catch (err) {
      console.error('[TransactionFeed] Error:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Use shared block refresh - EVERY BLOCK
  useBlockRefresh('txfeed', fetchTransactions, 1, !!tokenAddress);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) {
      seenTxsRef.current.clear();
      setTransactions([]);
      fetchTransactions();
    }
  }, [tokenAddress]); // fetchTransactions intentionally excluded

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const formatAmount = (amt: bigint): string => {
    const num = Number(formatUnits(amt, 18));
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const buyCount = transactions.filter(t => t.type === 'buy').length;
  const sellCount = transactions.filter(t => t.type === 'sell').length;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-fud-green" />
          <span className="font-display text-sm text-fud-green">TRANSACTIONS</span>
        </div>
        <div className="flex items-center gap-3 text-xs font-mono">
          <span className="flex items-center gap-1 text-fud-green">
            <ArrowUpRight size={12} />
            {buyCount} buys
          </span>
          <span className="flex items-center gap-1 text-orange-400">
            <ArrowDownRight size={12} />
            {sellCount} sells
          </span>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Activity size={32} className="mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-text-muted text-xs font-mono">Select a token</p>
            </div>
          </div>
        ) : isLoading && transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-text-muted text-xs font-mono">No transactions yet</p>
          </div>
        ) : (
          <div className="divide-y divide-fud-green/5">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className={`flex items-center gap-3 px-4 py-2 hover:bg-fud-green/5 transition-colors ${
                  tx.type === 'buy' ? 'border-l-2 border-fud-green' : 'border-l-2 border-orange-400'
                }`}
              >
                {/* Icon */}
                <div className={`p-1.5 rounded ${
                  tx.type === 'buy' ? 'bg-fud-green/20' : 'bg-orange-500/20'
                }`}>
                  {tx.type === 'buy' ? (
                    <ArrowUpRight size={14} className="text-fud-green" />
                  ) : (
                    <ArrowDownRight size={14} className="text-orange-400" />
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`text-xs font-mono font-bold ${
                      tx.type === 'buy' ? 'text-fud-green' : 'text-orange-400'
                    }`}>
                      {tx.type === 'buy' ? 'BUY' : 'SELL'}
                    </span>
                    <a
                      href={`https://scan.pulsechain.com/address/${tx.trader}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs font-mono text-text-muted hover:text-fud-green"
                    >
                      {formatAddress(tx.trader)}
                    </a>
                  </div>
                  <p className="text-[10px] font-mono text-text-muted">
                    {formatAmount(tx.tokenAmount)} tokens for {formatAmount(tx.plsAmount)} PLS
                  </p>
                </div>

                {/* Time & Link */}
                <div className="text-right flex items-center gap-2">
                  <span className="text-[10px] font-mono text-text-muted">
                    {formatTime(tx.timestamp)}
                  </span>
                  <a
                    href={`https://scan.pulsechain.com/tx/${tx.txHash}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-text-muted hover:text-fud-green transition-colors"
                  >
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
