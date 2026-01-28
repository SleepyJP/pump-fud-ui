'use client';

import { useBlockNumber } from 'wagmi';
import { useCallback, useRef, useState, useEffect } from 'react';

// Single shared block subscription for the entire dashboard
// Prevents 4+ simultaneous WebSocket connections

interface BlockSubscriber {
  id: string;
  interval: number; // refresh every N blocks
  callback: () => void;
}

const subscribers = new Map<string, BlockSubscriber>();
let lastBlockNumber: bigint | undefined;

export function useSharedBlockNumber() {
  return useBlockNumber({ watch: true });
}

export function useBlockRefresh(
  id: string,
  callback: () => void,
  interval: number = 5,
  enabled: boolean = true
) {
  const { data: blockNumber } = useBlockNumber({ watch: true });
  const callbackRef = useRef(callback);
  const lastCalledBlock = useRef<bigint>(BigInt(0));

  // Keep callback ref updated without triggering effects
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || !blockNumber) return;

    // Only call if we've advanced by at least `interval` blocks
    if (blockNumber - lastCalledBlock.current >= BigInt(interval)) {
      lastCalledBlock.current = blockNumber;
      callbackRef.current();
    }
  }, [blockNumber, interval, enabled]);

  return blockNumber;
}
