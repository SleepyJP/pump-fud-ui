'use client';

import { Users, Coins, Repeat, Activity } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { formatTokens } from '@/lib/utils';

interface WFudStatsGridProps {
  totalSupply: bigint;
  holderCount: number;
  totalReflected: bigint;
  tradingEnabled: boolean;
  isLoading: boolean;
}

export function WFudStatsGrid({
  totalSupply,
  holderCount,
  totalReflected,
  tradingEnabled,
  isLoading,
}: WFudStatsGridProps) {
  const stats = [
    {
      label: 'Total Supply',
      value: formatTokens(totalSupply),
      icon: Coins,
      color: 'text-fud-green',
      bgColor: 'bg-fud-green/10',
    },
    {
      label: 'Holders',
      value: holderCount.toLocaleString(),
      icon: Users,
      color: 'text-fud-purple',
      bgColor: 'bg-fud-purple/10',
    },
    {
      label: 'Total Reflected',
      value: formatTokens(totalReflected),
      icon: Repeat,
      color: 'text-fud-orange',
      bgColor: 'bg-fud-orange/10',
    },
    {
      label: 'Trading',
      value: tradingEnabled ? 'Active' : 'Paused',
      icon: Activity,
      color: tradingEnabled ? 'text-fud-green' : 'text-fud-red',
      bgColor: tradingEnabled ? 'bg-fud-green/10' : 'bg-fud-red/10',
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card key={stat.label} variant="default">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${stat.bgColor}`}>
                <stat.icon size={18} className={stat.color} />
              </div>
              <div>
                <p className="text-text-muted text-[10px] font-mono uppercase tracking-wider">
                  {stat.label}
                </p>
                {isLoading ? (
                  <div className="h-5 w-16 bg-dark-tertiary rounded animate-pulse mt-1" />
                ) : (
                  <p className={`font-mono text-sm font-bold ${stat.color}`}>
                    {stat.value}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
