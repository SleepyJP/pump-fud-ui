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
  const shortAddress = `${token.address.slice(0, 6)}...${token.address.slice(-4)}`;

  return (
    <Link href={`/token/${token.address}`}>
      <Card className="hover:border-fud-green/50 hover:shadow-[0_0_20px_rgba(0,255,0,0.3)] transition-all duration-300 cursor-pointer group">
        <div className="p-3">
          {/* Main layout: Big image left, info right */}
          <div className="flex gap-3">
            {/* BIG IMAGE - 80x80px, supports GIFs */}
            <div className="w-20 h-20 rounded-lg bg-dark-secondary flex-shrink-0 overflow-hidden border border-fud-green/30">
              {token.imageUri ? (
                <img
                  src={token.imageUri}
                  alt={token.name}
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl">🚀</span>
                </div>
              )}
            </div>

            {/* Right side: Name, Symbol, Stats */}
            <div className="flex-1 min-w-0 flex flex-col justify-between">
              {/* Name - BIG and BRIGHT */}
              <div>
                <h3 className="font-display text-lg text-fud-green font-bold truncate group-hover:text-fud-green-bright group-hover:drop-shadow-[0_0_8px_rgba(0,255,0,0.8)] transition-all">
                  {token.name}
                </h3>
                {/* Symbol - prominent */}
                <p className="text-white text-base font-bold font-mono">{token.symbol}</p>
              </div>

              {/* Stats row */}
              <div className="flex gap-3 text-xs font-mono mt-1">
                <div>
                  <span className="text-text-muted">Price: </span>
                  <span className="text-fud-green font-bold">{formatPLS(token.currentPrice, 6)}</span>
                </div>
                <div>
                  <span className="text-text-muted">MC: </span>
                  <span className="text-white">{formatPLS(token.plsReserve)}</span>
                </div>
              </div>

              {/* Graduated badge */}
              {token.graduated && (
                <span className="inline-block w-fit px-2 py-0.5 bg-fud-green/30 text-fud-green text-[10px] font-mono font-bold rounded border border-fud-green/50 mt-1">
                  🎓 GRADUATED
                </span>
              )}
            </div>
          </div>

          {/* Progress bar - only if not graduated */}
          {!token.graduated && (
            <div className="mt-2">
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-text-muted">Progress</span>
                <span className="text-fud-green font-bold">{progress}%</span>
              </div>
              <div className="h-2 bg-dark-secondary rounded-full overflow-hidden border border-fud-green/20">
                <div
                  className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                  style={{ width: `${Math.min(progress, 100)}%` }}
                />
              </div>
            </div>
          )}

          {/* Contract address at bottom */}
          <div className="mt-2 pt-2 border-t border-dark-secondary">
            <p className="text-[10px] font-mono text-text-muted truncate">
              CA: <span className="text-text-secondary">{shortAddress}</span>
            </p>
          </div>
        </div>
      </Card>
    </Link>
  );
}
