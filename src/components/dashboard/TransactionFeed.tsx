'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient, useReadContracts } from 'wagmi';
import { parseAbiItem, formatEther, erc20Abi } from 'viem';
import { ArrowUpRight, ArrowDownRight, Activity, ExternalLink, RefreshCw } from 'lucide-react';
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
  tokenSymbol?: string;
}

export function TransactionFeed({ tokenAddress, tokenSymbol = 'TOKEN' }: TransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<number>(0);
  const isMountedRef = useRef(true);

  const publicClient = usePublicClient();

  const fetchTransactions = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    setError(null);

    try {
      // Check if contract has code
      const code = await publicClient.getCode({ address: tokenAddress });
      if (!code || code === '0x') {
        setError('Token contract not found');
        setIsLoading(false);
        return;
      }

      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > BigInt(20000) ? currentBlock - BigInt(20000) : BigInt(0);

      console.log('[TransactionFeed] Fetching from block', fromBlock.toString(), 'to', currentBlock.toString());

      const [buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({
          address: tokenAddress,
          event: buyEvent,
          fromBlock,
          toBlock: currentBlock,
        }).catch(e => { console.error('[TransactionFeed] Buy logs error:', e); return []; }),
        publicClient.getLogs({
          address: tokenAddress,
          event: sellEvent,
          fromBlock,
          toBlock: currentBlock,
        }).catch(e => { console.error('[TransactionFeed] Sell logs error:', e); return []; }),
      ]);

      console.log('[TransactionFeed] Found', buyLogs.length, 'buys,', sellLogs.length, 'sells');

      if (!isMountedRef.current) return;

      // Get timestamps for unique blocks
      const allLogs = [...buyLogs, ...sellLogs];
      const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
      const blockTimestamps: Record<string, number> = {};

      // Fetch timestamps in batches
      const batchSize = 10;
      for (let i = 0; i < uniqueBlocks.length; i += batchSize) {
        const batch = uniqueBlocks.slice(i, i + batchSize);
        await Promise.all(
          batch.map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockTimestamps[bn.toString()] = Number(block.timestamp);
            } catch {
              blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000);
            }
          })
        );
      }

      if (!isMountedRef.current) return;

      const allTxs: Transaction[] = [];

      for (const log of buyLogs) {
        const args = log.args as { buyer?: `0x${string}`; plsSpent?: bigint; tokensBought?: bigint };
        if (!args?.buyer || !args?.plsSpent || !args?.tokensBought) continue;

        allTxs.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'buy',
          trader: args.buyer,
          plsAmount: args.plsSpent,
          tokenAmount: args.tokensBought,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ?? BigInt(0),
          timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        });
      }

      for (const log of sellLogs) {
        const args = log.args as { seller?: `0x${string}`; tokensSold?: bigint; plsReceived?: bigint };
        if (!args?.seller || !args?.tokensSold || !args?.plsReceived) continue;

        allTxs.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'sell',
          trader: args.seller,
          plsAmount: args.plsReceived,
          tokenAmount: args.tokensSold,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ?? BigInt(0),
          timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        });
      }

      // Sort newest first
      allTxs.sort((a, b) => b.timestamp - a.timestamp);

      setTransactions(allTxs.slice(0, 50));
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('[TransactionFeed] Error:', err);
      setError('Failed to fetch transactions');
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Initial fetch and refresh every 10 seconds
  useEffect(() => {
    if (tokenAddress) {
      setTransactions([]);
      fetchTransactions();
      const interval = setInterval(fetchTransactions, 10000);
      return () => clearInterval(interval);
    }
  }, [tokenAddress, fetchTransactions]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const formatAmount = (amt: bigint): string => {
    const num = Number(formatEther(amt));
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    if (num >= 1) return num.toFixed(2);
    return num.toFixed(4);
  };

  const formatTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
    return `${Math.floor(diff / 86400)}d`;
  };

  const buyCount = transactions.filter(t => t.type === 'buy').length;
  const sellCount = transactions.filter(t => t.type === 'sell').length;

  return (
    <div className="h-full flex flex-col bg-black/40">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-[#39ff14]/20">
        <div className="flex items-center gap-2">
          <Activity size={14} className="text-[#39ff14]" />
          <span className="font-mono text-xs text-[#39ff14] font-bold">TRANSACTIONS</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono">
          <span className="text-[#39ff14]">{buyCount} buys</span>
          <span className="text-orange-400">{sellCount} sells</span>
          <button onClick={fetchTransactions} className="text-gray-500 hover:text-[#39ff14]">
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-600 text-xs font-mono">Select a token</p>
          </div>
        ) : error ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-red-400 text-xs font-mono">{error}</p>
          </div>
        ) : isLoading && transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
          </div>
        ) : transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-600 text-xs font-mono">No transactions yet</p>
          </div>
        ) : (
          <table className="w-full text-[10px] font-mono">
            <thead className="text-gray-500 border-b border-gray-800 sticky top-0 bg-black/80">
              <tr>
                <th className="text-left py-1.5 px-2">Type</th>
                <th className="text-left py-1.5 px-2">Wallet</th>
                <th className="text-right py-1.5 px-2">Amount</th>
                <th className="text-right py-1.5 px-2">Value</th>
                <th className="text-right py-1.5 px-2">Time</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((tx) => (
                <tr
                  key={tx.id}
                  className="border-b border-gray-800/50 hover:bg-[#39ff14]/5 cursor-pointer"
                  onClick={() => window.open(`https://scan.pulsechain.com/tx/${tx.txHash}`, '_blank')}
                >
                  <td className="py-1.5 px-2">
                    <span className={`flex items-center gap-1 ${tx.type === 'buy' ? 'text-[#39ff14]' : 'text-orange-400'}`}>
                      {tx.type === 'buy' ? <ArrowUpRight size={10} /> : <ArrowDownRight size={10} />}
                      {tx.type.toUpperCase()}
                    </span>
                  </td>
                  <td className="py-1.5 px-2">
                    <a
                      href={`https://scan.pulsechain.com/address/${tx.trader}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-400 hover:text-[#39ff14]"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {formatAddress(tx.trader)}
                    </a>
                  </td>
                  <td className={`py-1.5 px-2 text-right ${tx.type === 'buy' ? 'text-[#39ff14]' : 'text-orange-400'}`}>
                    {formatAmount(tx.tokenAmount)} {tokenSymbol}
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-400">
                    {formatAmount(tx.plsAmount)} PLS
                  </td>
                  <td className="py-1.5 px-2 text-right text-gray-500">
                    {formatTime(tx.timestamp)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
