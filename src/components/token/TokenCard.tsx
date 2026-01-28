'use client';

import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { formatPLS, formatTokens } from '@/lib/utils';
import type { Token } from '@/types';

interface TokenCardProps {
  token: Token;
}

export function TokenCard({ token }: TokenCardProps) {
  const progress = Number(token.graduationProgress);

  return (
    <Link href={`/token/${token.address}`}>
      <Card className="hover:border-fud-green/50 transition-all duration-300 cursor-pointer group">
        <div className="p-4">
          <div className="flex items-start gap-3 mb-3">
            <div className="w-12 h-12 rounded-lg bg-dark-secondary flex items-center justify-center overflow-hidden">
              {token.imageUri ? (
                <img
                  src={token.imageUri}
                  alt={token.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-2xl">🚀</span>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-display text-fud-green truncate group-hover:animate-glow">
                {token.name}
              </h3>
              <p className="text-white text-sm font-mono">${token.symbol}</p>
            </div>
            {token.graduated && (
              <span className="px-2 py-0.5 bg-fud-green/20 text-fud-green text-[10px] font-mono rounded">
                GRADUATED
              </span>
            )}
          </div>

          <p className="text-text-secondary text-xs line-clamp-2 mb-3 h-8">
            {token.description || 'No description'}
          </p>

          <div className="space-y-2">
            <div className="flex justify-between text-xs font-mono">
              <span className="text-text-muted">Price</span>
              <span className="text-fud-green">{formatPLS(token.currentPrice, 8)} PLS</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-text-muted">Market Cap</span>
              <span className="text-text-secondary">{formatPLS(token.plsReserve)} PLS</span>
            </div>
            <div className="flex justify-between text-xs font-mono">
              <span className="text-text-muted">Supply</span>
              <span className="text-text-secondary">{formatTokens(token.totalSupply)}</span>
            </div>
          </div>

          {!token.graduated && (
            <div className="mt-3">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-text-muted">Graduation</span>
                <span className="text-fud-green">{progress}%</span>
              </div>
              <div className="h-1.5 bg-dark-secondary rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}
        </div>
      </Card>
    </Link>
  );
}
