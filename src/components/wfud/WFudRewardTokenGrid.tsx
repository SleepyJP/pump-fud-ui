'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { type YieldTokenInfo } from '@/hooks/useWFudData';
import { formatAddress } from '@/lib/utils';
import { formatUnits } from 'viem';

interface WFudRewardTokenGridProps {
  yieldTokens: YieldTokenInfo[];
  isLoading: boolean;
}

function formatYieldAmount(amount: bigint, decimals: number): string {
  const val = Number(formatUnits(amount, decimals));
  if (val >= 1_000_000_000) return `${(val / 1_000_000_000).toFixed(2)}B`;
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  if (val >= 1) return val.toFixed(2);
  if (val > 0) return val.toFixed(6);
  return '0';
}

export function WFudRewardTokenGrid({ yieldTokens, isLoading }: WFudRewardTokenGridProps) {
  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Reward Tokens</CardTitle>
        <span className="text-[10px] font-mono text-text-muted">
          {yieldTokens.length} token{yieldTokens.length !== 1 ? 's' : ''}
        </span>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-24 bg-dark-tertiary rounded-lg animate-pulse" />
            ))}
          </div>
        ) : yieldTokens.length === 0 ? (
          <p className="text-text-muted text-sm font-mono text-center py-4">
            No yield tokens configured
          </p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {yieldTokens.map((yt) => {
              const totalShareBps = Number(yt.share);
              return (
                <div
                  key={yt.address}
                  className="rounded-lg border p-3 transition-colors hover:border-opacity-60"
                  style={{
                    backgroundColor: yt.display.bgColor,
                    borderColor: yt.display.borderColor,
                  }}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-lg">{yt.display.icon}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-mono font-bold truncate" style={{ color: yt.display.color }}>
                        {yt.symbol}
                      </p>
                      <p className="text-[10px] text-text-muted font-mono truncate">
                        {yt.name}
                      </p>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted font-mono">Share</span>
                      <span className="text-[11px] font-mono font-bold" style={{ color: yt.display.color }}>
                        {(totalShareBps / 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-text-muted font-mono">Distributed</span>
                      <span className="text-[11px] font-mono text-text-secondary">
                        {formatYieldAmount(yt.totalDistributed, yt.decimals)}
                      </span>
                    </div>
                  </div>

                  <a
                    href={`https://scan.pulsechain.com/token/${yt.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="block mt-2 text-[9px] font-mono text-text-muted hover:text-text-secondary text-center"
                  >
                    {formatAddress(yt.address)}
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
