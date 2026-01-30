'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient, useWatchBlockNumber } from 'wagmi';
import { parseAbiItem, formatEther } from 'viem';
import { ArrowUpRight, ArrowDownRight, ExternalLink, RefreshCw, Filter, Wifi, WifiOff } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════════
// DEXSCREENER-STYLE TRANSACTION FEED
// Real-time updates on every block
// ═══════════════════════════════════════════════════════════════════════════════

interface Transaction {
  id: string;
  type: 'buy' | 'sell';
  trader: `0x${string}`;
  plsAmount: bigint;
  tokenAmount: bigint;
  price: number;
  txHash: `0x${string}`;
  blockNumber: bigint;
  timestamp: number;
}

interface TransactionFeedProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
}

type FilterType = 'all' | 'buys' | 'sells';

export function TransactionFeed({ tokenAddress, tokenSymbol = 'TOKEN' }: TransactionFeedProps) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isLive, setIsLive] = useState(true);
  const [filter, setFilter] = useState<FilterType>('all');
  const [lastBlock, setLastBlock] = useState<bigint>(BigInt(0));
  const lastFetchedBlockRef = useRef<bigint>(BigInt(0));
  const isMountedRef = useRef(true);

  const publicClient = usePublicClient();

  // ═══════════════════════════════════════════════════════════════════════════
  // REAL-TIME BLOCK WATCHING
  // ═══════════════════════════════════════════════════════════════════════════
  useWatchBlockNumber({
    onBlockNumber: useCallback((blockNumber: bigint) => {
      if (!isLive || !tokenAddress) return;
      setLastBlock(blockNumber);
      if (blockNumber > lastFetchedBlockRef.current) {
        fetchNewTransactions(blockNumber);
      }
    }, [isLive, tokenAddress]),
    enabled: isLive && !!tokenAddress,
    poll: true,
    pollingInterval: 1000,
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // FETCH NEW TRANSACTIONS (incremental)
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchNewTransactions = useCallback(async (currentBlock: bigint) => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    try {
      const fromBlock = lastFetchedBlockRef.current > BigInt(0)
        ? lastFetchedBlockRef.current + BigInt(1)
        : currentBlock - BigInt(1);

      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const [buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({ address: tokenAddress, event: buyEvent, fromBlock, toBlock: currentBlock }),
        publicClient.getLogs({ address: tokenAddress, event: sellEvent, fromBlock, toBlock: currentBlock }),
      ]);

      if (!isMountedRef.current) return;

      const allLogs = [...buyLogs, ...sellLogs];
      if (allLogs.length === 0) {
        lastFetchedBlockRef.current = currentBlock;
        return;
      }

      // Get timestamps
      const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
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

      const newTxs: Transaction[] = [];

      for (const log of buyLogs) {
        const args = log.args as { buyer?: `0x${string}`; plsSpent?: bigint; tokensBought?: bigint };
        if (!args?.buyer || !args?.plsSpent || !args?.tokensBought || args.tokensBought === BigInt(0)) continue;
        const price = Number(formatEther(args.plsSpent)) / Number(formatEther(args.tokensBought));
        newTxs.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'buy',
          trader: args.buyer,
          plsAmount: args.plsSpent,
          tokenAmount: args.tokensBought,
          price,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ?? BigInt(0),
          timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        });
      }

      for (const log of sellLogs) {
        const args = log.args as { seller?: `0x${string}`; tokensSold?: bigint; plsReceived?: bigint };
        if (!args?.seller || !args?.tokensSold || !args?.plsReceived || args.tokensSold === BigInt(0)) continue;
        const price = Number(formatEther(args.plsReceived)) / Number(formatEther(args.tokensSold));
        newTxs.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'sell',
          trader: args.seller,
          plsAmount: args.plsReceived,
          tokenAmount: args.tokensSold,
          price,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ?? BigInt(0),
          timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        });
      }

      if (newTxs.length > 0) {
        setTransactions(prev => {
          const combined = [...newTxs, ...prev];
          combined.sort((a, b) => b.timestamp - a.timestamp);
          return combined.slice(0, 100); // Keep last 100
        });
      }

      lastFetchedBlockRef.current = currentBlock;
    } catch (err) {
      console.error('[TransactionFeed] Error:', err);
    }
  }, [tokenAddress, publicClient]);

  // ═══════════════════════════════════════════════════════════════════════════
  // FULL HISTORY FETCH
  // ═══════════════════════════════════════════════════════════════════════════
  const fetchFullHistory = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock > BigInt(50000) ? currentBlock - BigInt(50000) : BigInt(0);

      const [buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({ address: tokenAddress, event: buyEvent, fromBlock, toBlock: currentBlock }),
        publicClient.getLogs({ address: tokenAddress, event: sellEvent, fromBlock, toBlock: currentBlock }),
      ]);

      if (!isMountedRef.current) return;

      const allLogs = [...buyLogs, ...sellLogs];
      const uniqueBlocks = [...new Set(allLogs.map(l => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
      const blockTimestamps: Record<string, number> = {};

      // Batch fetch timestamps
      const batchSize = 50;
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
        if (!args?.buyer || !args?.plsSpent || !args?.tokensBought || args.tokensBought === BigInt(0)) continue;
        const price = Number(formatEther(args.plsSpent)) / Number(formatEther(args.tokensBought));
        allTxs.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'buy',
          trader: args.buyer,
          plsAmount: args.plsSpent,
          tokenAmount: args.tokensBought,
          price,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ?? BigInt(0),
          timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        });
      }

      for (const log of sellLogs) {
        const args = log.args as { seller?: `0x${string}`; tokensSold?: bigint; plsReceived?: bigint };
        if (!args?.seller || !args?.tokensSold || !args?.plsReceived || args.tokensSold === BigInt(0)) continue;
        const price = Number(formatEther(args.plsReceived)) / Number(formatEther(args.tokensSold));
        allTxs.push({
          id: `${log.transactionHash}-${log.logIndex}`,
          type: 'sell',
          trader: args.seller,
          plsAmount: args.plsReceived,
          tokenAmount: args.tokensSold,
          price,
          txHash: log.transactionHash,
          blockNumber: log.blockNumber ?? BigInt(0),
          timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        });
      }

      allTxs.sort((a, b) => b.timestamp - a.timestamp);
      setTransactions(allTxs.slice(0, 100));
      lastFetchedBlockRef.current = currentBlock;
    } catch (err) {
      console.error('[TransactionFeed] Error:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient]);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) {
      setTransactions([]);
      lastFetchedBlockRef.current = BigInt(0);
      fetchFullHistory();
    }
  }, [tokenAddress, fetchFullHistory]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  // ═══════════════════════════════════════════════════════════════════════════
  // FORMATTING HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  const formatAmount = (amt: bigint, decimals = 2): string => {
    const num = Number(formatEther(amt));
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(decimals) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(decimals) + 'K';
    if (num >= 1) return num.toFixed(decimals);
    if (num >= 0.0001) return num.toFixed(4);
    return num.toFixed(6);
  };

  const formatPrice = (p: number): string => {
    if (p === 0) return '0';
    if (p < 0.00000001) return p.toExponential(2);
    if (p < 0.0001) return p.toFixed(8);
    if (p < 1) return p.toFixed(6);
    return p.toFixed(4);
  };

  const formatTime = (timestamp: number): string => {
    const now = Math.floor(Date.now() / 1000);
    const diff = now - timestamp;
    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ${Math.floor((diff % 3600) / 60)}m ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const formatAddress = (addr: string): string => {
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  // Filter transactions
  const filteredTxs = transactions.filter(tx => {
    if (filter === 'buys') return tx.type === 'buy';
    if (filter === 'sells') return tx.type === 'sell';
    return true;
  });

  const buyCount = transactions.filter(t => t.type === 'buy').length;
  const sellCount = transactions.filter(t => t.type === 'sell').length;

  return (
    <div className="h-full flex flex-col bg-black">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* HEADER - Tabs & Controls */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800">
        {/* Tabs */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 text-xs font-mono rounded ${
              filter === 'all' ? 'bg-gray-700 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            Transactions
          </button>
          <button
            onClick={() => setFilter('buys')}
            className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1 ${
              filter === 'buys' ? 'bg-[#d6ffe0]/20 text-[#d6ffe0]' : 'text-gray-400 hover:text-[#d6ffe0]'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-[#d6ffe0]" />
            Buys ({buyCount})
          </button>
          <button
            onClick={() => setFilter('sells')}
            className={`px-3 py-1 text-xs font-mono rounded flex items-center gap-1 ${
              filter === 'sells' ? 'bg-red-500/20 text-red-400' : 'text-gray-400 hover:text-red-400'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-red-400" />
            Sells ({sellCount})
          </button>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsLive(!isLive)}
            className={`flex items-center gap-1 px-2 py-1 rounded text-xs font-mono ${
              isLive ? 'bg-[#d6ffe0]/10 text-[#d6ffe0]' : 'bg-gray-800 text-gray-400'
            }`}
          >
            {isLive ? <Wifi size={10} className="animate-pulse" /> : <WifiOff size={10} />}
            {isLive ? 'LIVE' : 'PAUSED'}
          </button>
          <button
            onClick={fetchFullHistory}
            disabled={isLoading}
            className="p-1.5 text-gray-400 hover:text-[#d6ffe0]"
          >
            <RefreshCw size={12} className={isLoading ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TABLE */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1 overflow-auto">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-600 text-sm font-mono">Select a token</p>
          </div>
        ) : isLoading && transactions.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-[#d6ffe0]/30 border-t-[#d6ffe0] rounded-full animate-spin" />
          </div>
        ) : filteredTxs.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-600 text-sm font-mono">No transactions yet</p>
          </div>
        ) : (
          <table className="w-full text-xs font-mono">
            <thead className="text-gray-500 border-b border-gray-800 sticky top-0 bg-black z-10">
              <tr>
                <th className="text-left py-2 px-3 font-normal">
                  <div className="flex items-center gap-1">
                    DATE <Filter size={10} />
                  </div>
                </th>
                <th className="text-left py-2 px-3 font-normal">TYPE</th>
                <th className="text-right py-2 px-3 font-normal">PLS</th>
                <th className="text-right py-2 px-3 font-normal">{tokenSymbol}</th>
                <th className="text-right py-2 px-3 font-normal">PRICE</th>
                <th className="text-right py-2 px-3 font-normal">MAKER</th>
                <th className="text-center py-2 px-3 font-normal">TXN</th>
              </tr>
            </thead>
            <tbody>
              {filteredTxs.map((tx, i) => (
                <tr
                  key={tx.id}
                  className={`border-b border-gray-800/30 hover:bg-gray-900/50 transition-colors ${
                    i === 0 && isLive ? 'animate-pulse bg-[#d6ffe0]/5' : ''
                  }`}
                >
                  {/* DATE */}
                  <td className="py-2 px-3 text-gray-400 whitespace-nowrap">
                    {formatTime(tx.timestamp)}
                  </td>

                  {/* TYPE */}
                  <td className="py-2 px-3">
                    <span className={`font-bold ${tx.type === 'buy' ? 'text-[#d6ffe0]' : 'text-red-400'}`}>
                      {tx.type === 'buy' ? 'Buy' : 'Sell'}
                    </span>
                  </td>

                  {/* PLS AMOUNT */}
                  <td className={`py-2 px-3 text-right ${tx.type === 'buy' ? 'text-[#d6ffe0]' : 'text-red-400'}`}>
                    {formatAmount(tx.plsAmount)}
                  </td>

                  {/* TOKEN AMOUNT */}
                  <td className="py-2 px-3 text-right text-gray-300">
                    {formatAmount(tx.tokenAmount, 4)}
                  </td>

                  {/* PRICE */}
                  <td className="py-2 px-3 text-right text-white">
                    ${formatPrice(tx.price)}
                  </td>

                  {/* MAKER */}
                  <td className="py-2 px-3 text-right">
                    <a
                      href={`https://scan.pulsechain.com/address/${tx.trader}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={`hover:underline ${tx.type === 'buy' ? 'text-[#d6ffe0]' : 'text-red-400'}`}
                      onClick={(e) => e.stopPropagation()}
                    >
                      {formatAddress(tx.trader)}
                    </a>
                  </td>

                  {/* TXN LINK */}
                  <td className="py-2 px-3 text-center">
                    <a
                      href={`https://scan.pulsechain.com/tx/${tx.txHash}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gray-500 hover:text-[#d6ffe0] inline-flex"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <ExternalLink size={12} />
                    </a>
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
