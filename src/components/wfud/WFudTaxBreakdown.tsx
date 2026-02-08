'use client';

import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';

interface WFudTaxBreakdownProps {
  buyTax: bigint;
  sellTax: bigint;
  transferTax: bigint;
  treasuryShare: bigint;
  burnShare: bigint;
  reflectionShare: bigint;
  liquidityShare: bigint;
  yieldShare: bigint;
  supportShare: bigint;
  isLoading: boolean;
}

const SHARE_COLORS: { key: string; label: string; color: string; bgColor: string }[] = [
  { key: 'treasury', label: 'Treasury', color: '#8b5cf6', bgColor: 'rgba(139, 92, 246, 0.2)' },
  { key: 'burn', label: 'Burn', color: '#ef4444', bgColor: 'rgba(239, 68, 68, 0.2)' },
  { key: 'reflection', label: 'Reflection', color: '#d6ffe0', bgColor: 'rgba(214, 255, 224, 0.2)' },
  { key: 'liquidity', label: 'Auto-LP', color: '#3b82f6', bgColor: 'rgba(59, 130, 246, 0.2)' },
  { key: 'yield', label: 'Yield', color: '#f97316', bgColor: 'rgba(249, 115, 22, 0.2)' },
  { key: 'support', label: 'Support Buyback', color: '#ec4899', bgColor: 'rgba(236, 72, 153, 0.2)' },
];

function formatTaxBps(bps: bigint): string {
  const val = Number(bps);
  return (val / 100).toFixed(1) + '%';
}

export function WFudTaxBreakdown({
  buyTax,
  sellTax,
  transferTax,
  treasuryShare,
  burnShare,
  reflectionShare,
  liquidityShare,
  yieldShare,
  supportShare,
  isLoading,
}: WFudTaxBreakdownProps) {
  const shares = [treasuryShare, burnShare, reflectionShare, liquidityShare, yieldShare, supportShare];
  const totalShares = shares.reduce((sum, s) => sum + s, 0n);

  const sharePercentages = shares.map((s) =>
    totalShares > 0n ? Number((s * 10000n) / totalShares) / 100 : 0
  );

  return (
    <Card variant="default">
      <CardHeader>
        <CardTitle>Tax Breakdown</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-6 bg-dark-tertiary rounded animate-pulse" />
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tax rates row */}
            <div className="flex items-center gap-4 font-mono text-xs">
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Buy:</span>
                <span className="text-fud-green font-bold">{formatTaxBps(buyTax)}</span>
              </div>
              <div className="w-px h-4 bg-border-primary" />
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Sell:</span>
                <span className="text-fud-red font-bold">{formatTaxBps(sellTax)}</span>
              </div>
              <div className="w-px h-4 bg-border-primary" />
              <div className="flex items-center gap-2">
                <span className="text-text-muted">Transfer:</span>
                <span className="text-fud-purple font-bold">{formatTaxBps(transferTax)}</span>
              </div>
            </div>

            {/* 6-way distribution bar */}
            <div>
              <div className="flex rounded-lg overflow-hidden h-4 border border-border-primary">
                {SHARE_COLORS.map((sc, i) => {
                  const pct = sharePercentages[i];
                  if (pct === 0) return null;
                  return (
                    <div
                      key={sc.key}
                      style={{
                        width: `${pct}%`,
                        backgroundColor: sc.color,
                        minWidth: pct > 0 ? '2px' : '0',
                      }}
                      title={`${sc.label}: ${pct.toFixed(1)}%`}
                    />
                  );
                })}
              </div>
            </div>

            {/* Legend */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
              {SHARE_COLORS.map((sc, i) => {
                const pct = sharePercentages[i];
                return (
                  <div
                    key={sc.key}
                    className="flex items-center gap-2 px-2 py-1.5 rounded"
                    style={{ backgroundColor: sc.bgColor }}
                  >
                    <div
                      className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sc.color }}
                    />
                    <span className="text-[11px] font-mono text-text-secondary truncate">
                      {sc.label}
                    </span>
                    <span className="text-[11px] font-mono font-bold ml-auto" style={{ color: sc.color }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
