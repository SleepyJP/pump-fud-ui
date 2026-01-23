'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { Clock, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';
import type { Token } from '@/types';

interface LiveTokensListProps {
  limit?: number;
  showTitle?: boolean;
}

export function LiveTokensList({ limit = 6, showTitle = true }: LiveTokensListProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch token addresses from factory
  const { data: tokenAddresses } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(limit)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // Build multicall contracts for all token details
  const tokenContracts = tokenAddresses?.flatMap((addr) => [
    { address: addr, abi: TOKEN_ABI, functionName: 'name' },
    { address: addr, abi: TOKEN_ABI, functionName: 'symbol' },
    { address: addr, abi: TOKEN_ABI, functionName: 'imageUri' },
    { address: addr, abi: TOKEN_ABI, functionName: 'description' },
    { address: addr, abi: TOKEN_ABI, functionName: 'creator' },
    { address: addr, abi: TOKEN_ABI, functionName: 'plsReserve' },
    { address: addr, abi: TOKEN_ABI, functionName: 'graduated' },
    { address: addr, abi: TOKEN_ABI, functionName: 'getCurrentPrice' },
    { address: addr, abi: TOKEN_ABI, functionName: 'getGraduationProgress' },
    { address: addr, abi: TOKEN_ABI, functionName: 'totalSupply' },
  ]) || [];

  const { data: tokenData } = useReadContracts({
    contracts: tokenContracts as any,
    query: { enabled: tokenContracts.length > 0 },
  });

  // Process token data into usable format
  useEffect(() => {
    if (!tokenAddresses || !tokenData) {
      setIsLoading(false);
      return;
    }

    const processedTokens: Token[] = [];
    const fieldsPerToken = 10;

    for (let i = 0; i < tokenAddresses.length; i++) {
      const baseIndex = i * fieldsPerToken;
      const name = tokenData[baseIndex]?.result as string;
      const symbol = tokenData[baseIndex + 1]?.result as string;
      const imageUri = tokenData[baseIndex + 2]?.result as string;
      const description = tokenData[baseIndex + 3]?.result as string;
      const creator = tokenData[baseIndex + 4]?.result as `0x${string}`;
      const plsReserve = tokenData[baseIndex + 5]?.result as bigint;
      const graduated = tokenData[baseIndex + 6]?.result as boolean;
      const currentPrice = tokenData[baseIndex + 7]?.result as bigint;
      const graduationProgress = tokenData[baseIndex + 8]?.result as bigint;
      const totalSupply = tokenData[baseIndex + 9]?.result as bigint;

      if (name && symbol) {
        processedTokens.push({
          address: tokenAddresses[i],
          name,
          symbol,
          imageUri: imageUri || '',
          description: description || '',
          creator: creator || '0x0000000000000000000000000000000000000000',
          plsReserve: plsReserve || BigInt(0),
          graduated: graduated || false,
          currentPrice: currentPrice || BigInt(0),
          graduationProgress: Number(graduationProgress || 0),
          totalSupply: totalSupply || BigInt(0),
        });
      }
    }

    setTokens(processedTokens);
    setIsLoading(false);
  }, [tokenAddresses, tokenData]);

  // Calculate progress percentage
  const getProgressPercent = (reserve: bigint): number => {
    if (!reserve) return 0;
    const threshold = CONSTANTS.GRADUATION_THRESHOLD;
    return Math.min(Number((reserve * BigInt(100)) / threshold), 100);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {showTitle && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-fud-green text-lg">●</span>
            <h2 className="font-display text-xl text-text-primary">Live Tokens</h2>
            <span className="text-text-muted font-mono text-sm">(loading...)</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(limit)].map((_, i) => (
            <Card key={i} variant="bordered" className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-16 h-16 bg-dark-tertiary rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-dark-tertiary rounded w-3/4" />
                  <div className="h-4 bg-dark-tertiary rounded w-1/2" />
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (tokens.length === 0) {
    return (
      <div className="text-center py-12">
        {showTitle && (
          <div className="flex items-center justify-center gap-2 mb-4">
            <span className="text-fud-green text-lg">●</span>
            <h2 className="font-display text-xl text-text-primary">Live Tokens</h2>
            <span className="text-text-muted font-mono text-sm">(0)</span>
          </div>
        )}
        <p className="text-text-muted font-mono">No tokens created yet. Be the first!</p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <div className="flex items-center gap-2 mb-6">
          <span className="text-fud-green text-lg animate-pulse">●</span>
          <h2 className="font-display text-xl text-text-primary">Live Tokens</h2>
          <span className="text-text-muted font-mono text-sm">({tokens.length})</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {tokens.map((token) => {
          const progressPercent = getProgressPercent(token.plsReserve);

          return (
            <Link key={token.address} href={`/token/${token.address}`}>
              <Card
                variant="bordered"
                className="p-4 hover:border-fud-green/50 transition-all cursor-pointer group h-full"
              >
                <div className="flex gap-3 mb-3">
                  {/* Token Image */}
                  <div className="w-16 h-16 rounded-lg bg-dark-tertiary overflow-hidden flex items-center justify-center flex-shrink-0">
                    {token.imageUri ? (
                      <img
                        src={token.imageUri}
                        alt={token.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<span class="text-2xl">🚀</span>';
                        }}
                      />
                    ) : (
                      <span className="text-2xl">🚀</span>
                    )}
                  </div>

                  {/* Token Info */}
                  <div className="flex-1 min-w-0">
                    <h3 className="font-display text-fud-green truncate group-hover:animate-glow">
                      {token.name}
                    </h3>
                    <p className="text-text-muted text-sm font-mono">${token.symbol}</p>
                    {token.graduated && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-fud-orange/20 text-fud-orange text-[10px] font-mono rounded">
                        GRADUATED
                      </span>
                    )}
                  </div>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 gap-2 mb-3 text-xs font-mono">
                  <div>
                    <span className={`inline-block w-2 h-2 rounded-full mr-1.5 ${
                      token.graduated ? 'bg-fud-orange' : 'bg-red-500'
                    }`} />
                    <span className="text-text-muted">Reserve</span>
                    <div className="text-text-secondary">{formatPLS(token.plsReserve)} PLS</div>
                  </div>
                  <div>
                    <User size={10} className="inline mr-1.5 text-text-muted" />
                    <span className="text-text-muted">Creator</span>
                    <div className="text-text-secondary">{formatAddress(token.creator)}</div>
                  </div>
                </div>

                {/* Progress Bar */}
                {!token.graduated && (
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-text-muted">Progress to Graduation</span>
                      <span className="text-fud-green">
                        {progressPercent.toFixed(1)}% / {formatPLS(CONSTANTS.GRADUATION_THRESHOLD)} PLS
                      </span>
                    </div>
                    <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
