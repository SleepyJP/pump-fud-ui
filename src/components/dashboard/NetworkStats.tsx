'use client';

import { usePulseChainData, useNetworkHealth } from '@/hooks/usePulseChainData';
import { formatBlockNumber, formatDailyTx } from '@/lib/pulsechainApi';

interface NetworkStatsProps {
  compact?: boolean;
}

export function NetworkStats({ compact = false }: NetworkStatsProps) {
  const { data, gasPrices, plsPriceUSD, loading, error, lastUpdated, refresh } = usePulseChainData();
  const { isHealthy } = useNetworkHealth();

  if (error) {
    return (
      <div className="text-xs text-fud-red font-mono">
        Network offline
      </div>
    );
  }

  if (loading && !data) {
    return (
      <div className="text-xs text-text-muted font-mono animate-pulse">
        Loading network...
      </div>
    );
  }

  if (!data || !gasPrices) return null;

  if (compact) {
    return (
      <div className="flex items-center gap-3 text-xs font-mono">
        <span className="text-text-muted">
          PLS: <span className="text-fud-green">{plsPriceUSD}</span>
        </span>
        <span className="text-text-muted">
          Gas: <span className="text-fud-cyan">{gasPrices.medium}</span>
        </span>
        <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-fud-green' : 'bg-fud-red'}`} />
      </div>
    );
  }

  return (
    <div className="p-3 bg-dark-secondary rounded-lg border border-border-primary">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-mono font-semibold text-text-primary">
          PulseChain Network
        </h3>
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-fud-green animate-pulse' : 'bg-fud-red'}`} />
          <button
            onClick={() => refresh()}
            className="text-xs text-text-muted hover:text-fud-green transition-colors"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-text-muted">PLS Price</div>
          <div className="text-sm font-mono text-fud-green">{plsPriceUSD}</div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-text-muted">Latest Block</div>
          <div className="text-sm font-mono text-text-primary">
            {formatBlockNumber(data.latest_block)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-text-muted">24h Transactions</div>
          <div className="text-sm font-mono text-fud-cyan">
            {formatDailyTx(data.daily_tx)}
          </div>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-text-muted">Block Time</div>
          <div className="text-sm font-mono text-text-primary">
            {data.average_block_time.toFixed(1)}s
          </div>
        </div>
      </div>

      <div className="mt-3 pt-3 border-t border-border-primary">
        <div className="text-xs text-text-muted mb-2">Gas Prices (Gwei)</div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-fud-green" />
            <span className="text-xs font-mono text-text-secondary">
              Slow: {gasPrices.slow}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-fud-cyan" />
            <span className="text-xs font-mono text-text-secondary">
              Medium: {gasPrices.medium}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-fud-orange" />
            <span className="text-xs font-mono text-text-secondary">
              Fast: {gasPrices.fast}
            </span>
          </div>
        </div>
      </div>

      {lastUpdated && (
        <div className="mt-2 text-[10px] text-text-muted text-right">
          Updated: {new Date(lastUpdated).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
}
