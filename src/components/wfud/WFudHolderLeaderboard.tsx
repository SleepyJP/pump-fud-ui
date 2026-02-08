'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { type HolderInfo } from '@/hooks/useWFudData';
import { formatAddress, formatTokens } from '@/lib/utils';

interface WFudHolderLeaderboardProps {
  holders: HolderInfo[];
  isLoading: boolean;
  holderCount: number;
}

function getRankColor(rank: number): string {
  if (rank === 1) return 'text-yellow-400';
  if (rank === 2) return 'text-gray-300';
  if (rank === 3) return 'text-orange-400';
  return 'text-text-muted';
}

function getRankBg(rank: number): string {
  if (rank === 1) return 'bg-yellow-400/10 border-yellow-400/30';
  if (rank === 2) return 'bg-gray-400/5 border-gray-400/20';
  if (rank === 3) return 'bg-orange-400/5 border-orange-400/20';
  return 'bg-transparent border-border-primary';
}

export function WFudHolderLeaderboard({
  holders,
  isLoading,
  holderCount,
}: WFudHolderLeaderboardProps) {
  return (
    <Card variant="default" className="flex flex-col">
      <CardHeader>
        <CardTitle>Holder Leaderboard</CardTitle>
        <span className="text-[10px] font-mono text-text-muted">
          Top {holders.length} of {holderCount.toLocaleString()}
        </span>
      </CardHeader>
      <CardContent className="flex-1 overflow-hidden p-0">
        {isLoading ? (
          <div className="p-4 space-y-2">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-8 bg-dark-tertiary rounded animate-pulse" />
            ))}
          </div>
        ) : holders.length === 0 ? (
          <div className="p-4">
            <p className="text-text-muted text-sm font-mono text-center py-4">No holders found</p>
          </div>
        ) : (
          <div className="overflow-y-auto max-h-[500px]">
            {/* Header Row */}
            <div className="sticky top-0 bg-dark-card border-b border-border-primary px-4 py-2 flex items-center text-[10px] font-mono text-text-muted uppercase tracking-wider">
              <span className="w-8">#</span>
              <span className="flex-1">Address</span>
              <span className="w-24 text-right">Balance</span>
              <span className="w-16 text-right">%</span>
            </div>

            {holders.map((holder, idx) => {
              const rank = idx + 1;
              return (
                <div
                  key={holder.address}
                  className={`flex items-center px-4 py-2 border-b transition-colors hover:bg-dark-tertiary/50 ${getRankBg(rank)}`}
                >
                  <span className={`w-8 text-xs font-mono font-bold ${getRankColor(rank)}`}>
                    {rank}
                  </span>
                  <a
                    href={`https://scan.pulsechain.com/address/${holder.address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-xs font-mono text-text-secondary hover:text-fud-green transition-colors"
                  >
                    {formatAddress(holder.address)}
                  </a>
                  <span className="w-24 text-right text-xs font-mono text-text-primary">
                    {formatTokens(holder.balance)}
                  </span>
                  <span className={`w-16 text-right text-xs font-mono font-bold ${
                    holder.percent >= 10 ? 'text-fud-red' :
                    holder.percent >= 5 ? 'text-fud-orange' :
                    'text-fud-green'
                  }`}>
                    {holder.percent.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
