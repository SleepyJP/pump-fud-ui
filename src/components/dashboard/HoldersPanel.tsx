'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient } from 'wagmi';
import { parseAbiItem, formatUnits } from 'viem';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';
import { Users, Crown, ExternalLink, Percent } from 'lucide-react';
import { formatAddress } from '@/lib/utils';

interface HolderData {
  address: `0x${string}`;
  balance: bigint;
  percentage: number;
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
  const isMountedRef = useRef(true);

  const publicClient = usePublicClient();

  const fetchHolders = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    setIsLoading(true);
    try {
      const transferEvent = parseAbiItem('event Transfer(address indexed from, address indexed to, uint256 value)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(30000);

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

        // Subtract from sender (unless mint)
        if (fromAddr !== ZERO.toLowerCase()) {
          const currentFrom = balances.get(fromAddr) || BigInt(0);
          balances.set(fromAddr, currentFrom - args.value);
        }

        // Add to receiver (unless burn)
        if (toAddr !== ZERO.toLowerCase() && toAddr !== '0x000000000000000000000000000000000000dead') {
          const currentTo = balances.get(toAddr) || BigInt(0);
          balances.set(toAddr, currentTo + args.value);
        }
      }

      if (!isMountedRef.current) return;

      // Convert to array, filter positive, sort by balance
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

      setHolders(holderArray.slice(0, 20));
    } catch (err) {
      console.error('[HoldersPanel] Error:', err);
    } finally {
      if (isMountedRef.current) setIsLoading(false);
    }
  }, [tokenAddress, publicClient, totalSupply, creator]);

  // Use shared block refresh - EVERY BLOCK
  useBlockRefresh('holders', fetchHolders, 1, !!tokenAddress);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) fetchHolders();
  }, [tokenAddress]); // fetchHolders intentionally excluded

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

  const formatBalance = (balance: bigint): string => {
    const num = Number(formatUnits(balance, 18));
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const getHolderColor = (index: number, percentage: number): string => {
    if (index === 0) return 'text-yellow-400';
    if (index === 1) return 'text-gray-300';
    if (index === 2) return 'text-amber-600';
    if (percentage >= 5) return 'text-fud-green';
    return 'text-text-primary';
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
        <div className="flex items-center gap-2">
          <Users size={18} className="text-fud-green" />
          <span className="font-display text-sm text-fud-green">HOLDERS</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">
          {holders.length} addresses
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {!tokenAddress ? (
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <Users size={32} className="mx-auto mb-2 text-text-muted opacity-50" />
              <p className="text-text-muted text-xs font-mono">Select a token</p>
            </div>
          </div>
        ) : isLoading && holders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin" />
          </div>
        ) : holders.length === 0 ? (
          <div className="h-full flex items-center justify-center">
            <p className="text-text-muted text-xs font-mono">No holders found</p>
          </div>
        ) : (
          <div className="divide-y divide-fud-green/5">
            {holders.map((holder, index) => (
              <div
                key={holder.address}
                className={`flex items-center gap-2 px-3 py-2 hover:bg-fud-green/5 transition-colors ${
                  index < 3 ? 'bg-fud-green/5' : ''
                }`}
              >
                {/* Rank */}
                <div className="w-6 flex items-center justify-center">
                  {index < 3 ? (
                    <Crown size={14} className={getHolderColor(index, holder.percentage)} />
                  ) : (
                    <span className="text-[10px] font-mono text-text-muted">#{index + 1}</span>
                  )}
                </div>

                {/* Address */}
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://scan.pulsechain.com/address/${holder.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`text-xs font-mono hover:underline flex items-center gap-1 ${getHolderColor(index, holder.percentage)}`}
                  >
                    {formatAddress(holder.address)}
                    {holder.isCreator && (
                      <span className="px-1 py-0.5 bg-fud-purple/20 text-fud-purple text-[8px] rounded">DEV</span>
                    )}
                    <ExternalLink size={10} className="opacity-50" />
                  </a>
                </div>

                {/* Balance */}
                <div className="text-right">
                  <p className="text-xs font-mono text-text-primary">
                    {formatBalance(holder.balance)}
                  </p>
                  <p className={`text-[10px] font-mono flex items-center justify-end gap-0.5 ${
                    holder.percentage >= 5 ? 'text-fud-green' : 'text-text-muted'
                  }`}>
                    <Percent size={8} />
                    {holder.percentage.toFixed(2)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
