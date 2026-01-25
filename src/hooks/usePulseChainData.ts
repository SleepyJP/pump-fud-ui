'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  getNetworkData,
  NetworkData,
  estimateTxCost,
  formatGasPrices,
  formatPLSPriceUSD,
  plsToUSD,
  GAS_LIMITS,
  TxCostEstimate,
  GasPricesFormatted,
} from '@/lib/pulsechainApi';

// ═══════════════════════════════════════
// MAIN HOOK - usePulseChainData
// ═══════════════════════════════════════

interface UsePulseChainDataOptions {
  /** Refresh interval in milliseconds (default: 30000 = 30s) */
  refreshInterval?: number;
  /** Auto-refresh enabled (default: true) */
  autoRefresh?: boolean;
}

interface UsePulseChainDataReturn {
  /** Raw network data from API */
  data: NetworkData | null;
  /** Loading state */
  loading: boolean;
  /** Error if fetch failed */
  error: Error | null;
  /** Last successful fetch timestamp */
  lastUpdated: number | null;
  /** Manual refresh function */
  refresh: () => Promise<void>;
  /** Formatted gas prices in gwei */
  gasPrices: GasPricesFormatted | null;
  /** PLS/USD rate formatted */
  plsPriceUSD: string | null;
  /** Latest block number */
  latestBlock: number | null;
  /** Daily transaction count */
  dailyTx: number | null;
}

export function usePulseChainData(options: UsePulseChainDataOptions = {}): UsePulseChainDataReturn {
  const { refreshInterval = 30000, autoRefresh = true } = options;

  const [data, setData] = useState<NetworkData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [lastUpdated, setLastUpdated] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const networkData = await getNetworkData();
      setData(networkData);
      setError(null);
      setLastUpdated(Date.now());
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();

    if (autoRefresh && refreshInterval > 0) {
      const interval = setInterval(fetchData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [fetchData, refreshInterval, autoRefresh]);

  const gasPrices = useMemo(() => (data ? formatGasPrices(data) : null), [data]);
  const plsPriceUSD = useMemo(() => (data ? formatPLSPriceUSD(data.plsusd_rate) : null), [data]);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData,
    gasPrices,
    plsPriceUSD,
    latestBlock: data?.latest_block ?? null,
    dailyTx: data?.daily_tx ?? null,
  };
}

// ═══════════════════════════════════════
// SPECIALIZED HOOKS
// ═══════════════════════════════════════

/**
 * Hook for gas estimation in trade panels
 */
interface UseGasEstimateOptions {
  /** Gas limit for the transaction */
  gasLimit?: number;
  /** Operation type from GAS_LIMITS presets */
  operation?: keyof typeof GAS_LIMITS;
}

interface UseGasEstimateReturn {
  estimate: TxCostEstimate | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
}

export function useGasEstimate(options: UseGasEstimateOptions = {}): UseGasEstimateReturn {
  const { gasLimit, operation = 'TOKEN_BUY' } = options;
  const { data, loading, error, refresh } = usePulseChainData({ refreshInterval: 15000 });

  const effectiveGasLimit = gasLimit ?? GAS_LIMITS[operation];

  const estimate = useMemo(() => {
    if (!data) return null;
    return estimateTxCost(effectiveGasLimit, data);
  }, [data, effectiveGasLimit]);

  return { estimate, loading, error, refresh };
}

/**
 * Hook for PLS price display
 */
interface UsePLSPriceReturn {
  rate: number | null;
  formatted: string | null;
  loading: boolean;
  error: Error | null;
  /** Convert PLS amount to USD string */
  toUSD: (plsAmount: number | bigint) => string;
}

export function usePLSPrice(): UsePLSPriceReturn {
  const { data, loading, error } = usePulseChainData({ refreshInterval: 30000 });

  const toUSD = useCallback(
    (plsAmount: number | bigint) => {
      if (!data) return '--';
      return plsToUSD(plsAmount, data.plsusd_rate);
    },
    [data]
  );

  return {
    rate: data?.plsusd_rate ?? null,
    formatted: data ? formatPLSPriceUSD(data.plsusd_rate) : null,
    loading,
    error,
    toUSD,
  };
}

/**
 * Hook for network health check
 */
interface UseNetworkHealthReturn {
  isHealthy: boolean;
  blockAge: number | null;
  latestBlock: number | null;
  loading: boolean;
}

export function useNetworkHealth(): UseNetworkHealthReturn {
  const { data, loading } = usePulseChainData({ refreshInterval: 10000 });

  const blockAge = useMemo(() => {
    if (!data) return null;
    return Math.floor(Date.now() / 1000) - data.timestamp;
  }, [data]);

  const isHealthy = blockAge !== null && blockAge < 60;

  return {
    isHealthy,
    blockAge,
    latestBlock: data?.latest_block ?? null,
    loading,
  };
}
