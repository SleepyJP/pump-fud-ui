'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { Clock, User } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import type { Token } from '@/types';

type FilterType = 'live' | 'rising' | 'new' | 'graduated';

interface LiveTokensListProps {
  limit?: number;
  showTitle?: boolean;
  filter?: FilterType;
}

export function LiveTokensList({ limit = 6, showTitle = true, filter = 'live' }: LiveTokensListProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { hiddenTokens } = useSiteSettings();

  // Filter title based on active filter
  const filterTitles: Record<FilterType, string> = {
    live: 'Live Tokens',
    rising: 'Rising Tokens',
    new: 'New Tokens',
    graduated: 'Graduated Tokens',
  };

  // Fetch all tokens from factory (returns structs with all data)
  const { data: allTokensData } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getAllTokens',
    args: [BigInt(0), BigInt(limit)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // Extract token addresses for multicall to get price/progress data
  const tokenAddresses = allTokensData?.map((t) => t.tokenAddress as `0x${string}`) || [];

  // Build multicall for price/progress data (not in factory struct)
  const priceContracts = tokenAddresses?.flatMap((addr) => [
    { address: addr, abi: TOKEN_ABI, functionName: 'getCurrentPrice' },
    { address: addr, abi: TOKEN_ABI, functionName: 'getGraduationProgress' },
    { address: addr, abi: TOKEN_ABI, functionName: 'totalSupply' },
  ]) || [];

  const { data: priceData } = useReadContracts({
    contracts: priceContracts as any,
    query: { enabled: priceContracts.length > 0 },
  });

  // Process token data into usable format
  useEffect(() => {
    if (!allTokensData) {
      setIsLoading(false);
      return;
    }

    const processedTokens: Token[] = [];
    const fieldsPerToken = 3; // getCurrentPrice, getGraduationProgress, totalSupply

    for (let i = 0; i < allTokensData.length; i++) {
      const token = allTokensData[i];

      // Skip non-live tokens (status 0 = Live, 1 = Graduated, 2 = Paused, 3 = Delisted)
      if (token.status !== 0 && token.status !== 1) continue;

      const baseIndex = i * fieldsPerToken;
      const currentPrice = priceData?.[baseIndex]?.result as bigint || BigInt(0);
      const graduationProgress = priceData?.[baseIndex + 1]?.result as bigint || BigInt(0);
      const totalSupply = priceData?.[baseIndex + 2]?.result as bigint || BigInt(0);

      if (token.name && token.symbol) {
        processedTokens.push({
          address: token.tokenAddress as `0x${string}`,
          name: token.name,
          symbol: token.symbol,
          imageUri: token.imageUri || '',
          description: token.description || '',
          creator: token.creator as `0x${string}`,
          plsReserve: token.reserveBalance || BigInt(0),
          graduated: token.status === 1,
          currentPrice,
          graduationProgress: Number(graduationProgress),
          totalSupply,
        });
      }
    }

    // Filter out hidden tokens
    let visibleTokens = processedTokens.filter(
      (token) => !hiddenTokens.some((hidden) => hidden.toLowerCase() === token.address.toLowerCase())
    );

    // Apply filter
    switch (filter) {
      case 'live':
        visibleTokens = visibleTokens.filter((t) => !t.graduated);
        break;
      case 'graduated':
        visibleTokens = visibleTokens.filter((t) => t.graduated);
        break;
      case 'rising':
        // Sort by reserve (proxy for activity/rising)
        visibleTokens = visibleTokens
          .filter((t) => !t.graduated)
          .sort((a, b) => Number(b.plsReserve - a.plsReserve));
        break;
      case 'new':
        // All tokens sorted by most recent (already sorted by contract)
        visibleTokens = visibleTokens.filter((t) => !t.graduated);
        break;
    }

    setTokens(visibleTokens);
    setIsLoading(false);
  }, [allTokensData, priceData, hiddenTokens, filter]);

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
            <span className={`text-lg ${filter === 'graduated' ? 'text-fud-orange' : 'text-fud-green'}`}>●</span>
            <h2 className="font-display text-xl text-text-primary">{filterTitles[filter]}</h2>
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
            <span className={`text-lg ${filter === 'graduated' ? 'text-fud-orange' : 'text-fud-green'}`}>●</span>
            <h2 className="font-display text-xl text-text-primary">{filterTitles[filter]}</h2>
            <span className="text-text-muted font-mono text-sm">(0)</span>
          </div>
        )}
        <p className="text-text-muted font-mono">
          {filter === 'graduated' ? 'No graduated tokens yet.' : 'No tokens created yet. Be the first!'}
        </p>
      </div>
    );
  }

  return (
    <div>
      {showTitle && (
        <div className="flex items-center gap-2 mb-6">
          <span className={`text-lg ${filter === 'graduated' ? 'text-fud-orange animate-none' : 'text-fud-green animate-pulse'}`}>●</span>
          <h2 className="font-display text-xl text-text-primary">{filterTitles[filter]}</h2>
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
