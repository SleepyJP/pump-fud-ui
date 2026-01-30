'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { usePublicClient, useBlockNumber } from 'wagmi';
import { parseAbiItem } from 'viem';

export interface BumpData {
  lastBumpTime: number;
  lastBuyer: `0x${string}`;
  recentBumps: number; // Bumps in last 5 minutes
  isHot: boolean; // 3+ bumps in 5 min
}

export type BumpMap = Record<string, BumpData>;

interface BumpEvent {
  token: `0x${string}`;
  buyer: `0x${string}`;
  timestamp: number;
  blockNumber: bigint;
}

const FIVE_MINUTES = 5 * 60;

export function useBumpTracking(tokenAddresses: `0x${string}`[]) {
  const [bumpMap, setBumpMap] = useState<BumpMap>({});
  const [isLoading, setIsLoading] = useState(false);
  const lastFetchBlockRef = useRef<bigint>(BigInt(0));

  const publicClient = usePublicClient();
  const { data: blockNumber } = useBlockNumber({ watch: true });

  const fetchBumps = useCallback(async () => {
    if (!publicClient || tokenAddresses.length === 0) return;
    if (blockNumber && blockNumber === lastFetchBlockRef.current) return;
    if (blockNumber) lastFetchBlockRef.current = blockNumber;

    setIsLoading(true);

    try {
      // V3: TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');

      const currentBlock = await publicClient.getBlockNumber();
      // Look back ~30 minutes on PulseChain (600 blocks at ~3s/block)
      const fromBlock = currentBlock - BigInt(600);

      // Query all token addresses at once
      const logs = await publicClient.getLogs({
        address: tokenAddresses,
        event: buyEvent,
        fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
        toBlock: currentBlock,
      });

      // Get block timestamps for all unique blocks
      const blockNumbers = [...new Set(logs.map((l) => l.blockNumber).filter((bn): bn is bigint => bn !== undefined))];
      const blockTimestamps: Record<string, number> = {};

      // Fetch in batches
      for (let i = 0; i < blockNumbers.length; i += 50) {
        const batch = blockNumbers.slice(i, i + 50);
        await Promise.all(
          batch.map(async (bn) => {
            try {
              const block = await publicClient.getBlock({ blockNumber: bn });
              blockTimestamps[bn.toString()] = Number(block.timestamp);
            } catch {
              const blocksAgo = Number(currentBlock - bn);
              blockTimestamps[bn.toString()] = Math.floor(Date.now() / 1000) - blocksAgo * 3;
            }
          })
        );
      }

      // Parse events
      const events: BumpEvent[] = logs.map((log) => ({
        token: log.address.toLowerCase() as `0x${string}`,
        buyer: (log.args as { buyer: `0x${string}` }).buyer,
        timestamp: blockTimestamps[log.blockNumber?.toString() ?? '0'] || Math.floor(Date.now() / 1000),
        blockNumber: log.blockNumber ?? BigInt(0),
      }));

      // Build bump map
      const newBumpMap: BumpMap = {};
      const now = Math.floor(Date.now() / 1000);

      for (const token of tokenAddresses) {
        const tokenLower = token.toLowerCase();
        const tokenEvents = events.filter((e) => e.token === tokenLower);

        if (tokenEvents.length === 0) {
          newBumpMap[tokenLower] = {
            lastBumpTime: 0,
            lastBuyer: '0x0000000000000000000000000000000000000000' as `0x${string}`,
            recentBumps: 0,
            isHot: false,
          };
          continue;
        }

        // Sort by timestamp descending (most recent first)
        tokenEvents.sort((a, b) => b.timestamp - a.timestamp);

        const mostRecent = tokenEvents[0];
        const recentBumps = tokenEvents.filter((e) => now - e.timestamp <= FIVE_MINUTES).length;

        newBumpMap[tokenLower] = {
          lastBumpTime: mostRecent.timestamp,
          lastBuyer: mostRecent.buyer,
          recentBumps,
          isHot: recentBumps >= 3,
        };
      }

      setBumpMap(newBumpMap);
    } catch (err) {
      console.error('[BumpTracking] Failed to fetch bumps:', err);
    } finally {
      setIsLoading(false);
    }
  }, [publicClient, tokenAddresses, blockNumber]);

  // Fetch on mount and when block changes
  useEffect(() => {
    if (tokenAddresses.length > 0) {
      fetchBumps();
    }
  }, [tokenAddresses.length, blockNumber]); // eslint-disable-line react-hooks/exhaustive-deps

  // Helper to get time since last bump
  const getTimeSinceBump = useCallback((tokenAddress: string): string => {
    const data = bumpMap[tokenAddress.toLowerCase()];
    if (!data || data.lastBumpTime === 0) return 'No activity';

    const now = Math.floor(Date.now() / 1000);
    const diff = now - data.lastBumpTime;

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }, [bumpMap]);

  // Check if token was bumped in last N seconds
  const wasBumpedRecently = useCallback((tokenAddress: string, seconds: number = 30): boolean => {
    const data = bumpMap[tokenAddress.toLowerCase()];
    if (!data || data.lastBumpTime === 0) return false;

    const now = Math.floor(Date.now() / 1000);
    return now - data.lastBumpTime <= seconds;
  }, [bumpMap]);

  return {
    bumpMap,
    isLoading,
    getTimeSinceBump,
    wasBumpedRecently,
    refetch: fetchBumps,
  };
}
