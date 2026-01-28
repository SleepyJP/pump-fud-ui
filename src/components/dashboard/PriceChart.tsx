'use client';

import { ErrorBoundary } from '@/components/ErrorBoundary';
import { ChartPanel } from './ChartPanel';

interface PriceChartProps {
  tokenAddress?: `0x${string}`;
}

export function PriceChart({ tokenAddress }: PriceChartProps) {
  return (
    <ErrorBoundary
      fallback={
        <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
          <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
            <div className="flex items-center gap-3">
              <span className="text-fud-green text-lg">📊</span>
              <span className="font-display text-sm text-fud-green">PRICE CHART</span>
            </div>
          </div>
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-4">
              <div className="text-6xl mb-4 opacity-50">📈</div>
              <p className="text-text-muted text-sm font-mono mb-2">Chart temporarily unavailable</p>
              <p className="text-text-muted/50 text-xs font-mono">Refresh the page to retry</p>
            </div>
          </div>
        </div>
      }
    >
      <ChartPanel tokenAddress={tokenAddress} />
    </ErrorBoundary>
  );
}
