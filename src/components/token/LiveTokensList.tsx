'use client';

import { useEffect, useState, useMemo } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { User, Zap } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import { useBumpTracking } from '@/hooks/useBumpTracking';
import type { Token } from '@/types';

type FilterType = 'live' | 'rising' | 'new' | 'graduated' | 'bumped';

interface LiveTokensListProps {
  limit?: number;
  showTitle?: boolean;
  filter?: FilterType;
}

export function LiveTokensList({ limit = 6, showTitle = true, filter = 'live' }: LiveTokensListProps) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { hiddenTokens } = useSiteSettings();

  const filterTitles: Record<FilterType, string> = {
    live: 'Live Tokens',
    bumped: '🔥 Recently Bumped',
    rising: 'Rising Tokens',
    new: 'New Tokens',
    graduated: 'Graduated Tokens',
  };

  // V2 Factory: getTokens returns array of token addresses
  const { data: tokenAddresses } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(limit)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // Build multicall to get all token data from each token contract
  const tokenDataContracts = (tokenAddresses || []).flatMap((addr) => [
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'name' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'symbol' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'imageUri' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'description' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'creator' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'plsReserve' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'graduated' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'deleted' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'getCurrentPrice' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'getGraduationProgress' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'totalSupply' },
  ]);

  const { data: tokenData } = useReadContracts({
    contracts: tokenDataContracts as any,
    query: { enabled: tokenDataContracts.length > 0 },
  });

  // BUMP TRACKING: Get bump data for all tokens
  const tokenAddressList = useMemo(
    () => (tokenAddresses || []) as `0x${string}`[],
    [tokenAddresses]
  );
  const { bumpMap, getTimeSinceBump, wasBumpedRecently } = useBumpTracking(tokenAddressList);

  // Process token data
  useEffect(() => {
    if (!tokenAddresses || tokenAddresses.length === 0) {
      setIsLoading(false);
      return;
    }

    const processedTokens: Token[] = [];
    const fieldsPerToken = 11; // name, symbol, imageUri, description, creator, plsReserve, graduated, deleted, getCurrentPrice, getGraduationProgress, totalSupply

    for (let i = 0; i < tokenAddresses.length; i++) {
      const baseIndex = i * fieldsPerToken;

      const name = tokenData?.[baseIndex]?.result as string;
      const symbol = tokenData?.[baseIndex + 1]?.result as string;
      const imageUri = tokenData?.[baseIndex + 2]?.result as string;
      const description = tokenData?.[baseIndex + 3]?.result as string;
      const creator = tokenData?.[baseIndex + 4]?.result as `0x${string}`;
      const plsReserve = tokenData?.[baseIndex + 5]?.result as bigint || BigInt(0);
      const graduated = tokenData?.[baseIndex + 6]?.result as boolean || false;
      const deleted = tokenData?.[baseIndex + 7]?.result as boolean || false;
      const currentPrice = tokenData?.[baseIndex + 8]?.result as bigint || BigInt(0);
      const graduationProgress = tokenData?.[baseIndex + 9]?.result as bigint || BigInt(0);
      const totalSupply = tokenData?.[baseIndex + 10]?.result as bigint || BigInt(0);

      // Skip deleted tokens
      if (deleted) continue;

      if (name && symbol) {
        processedTokens.push({
          address: tokenAddresses[i] as `0x${string}`,
          name,
          symbol,
          imageUri: imageUri || '',
          description: description || '',
          creator: creator || '0x0000000000000000000000000000000000000000',
          plsReserve,
          graduated,
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

    // Apply filter with BUMP TRACKING
    switch (filter) {
      case 'live':
        // Live tokens sorted by most recent bump (activity)
        visibleTokens = visibleTokens
          .filter((t) => !t.graduated)
          .sort((a, b) => {
            const bumpA = bumpMap[a.address.toLowerCase()]?.lastBumpTime || 0;
            const bumpB = bumpMap[b.address.toLowerCase()]?.lastBumpTime || 0;
            return bumpB - bumpA; // Most recent first
          });
        break;
      case 'bumped':
        // Only tokens bumped in the last 5 minutes
        visibleTokens = visibleTokens
          .filter((t) => !t.graduated && (bumpMap[t.address.toLowerCase()]?.lastBumpTime || 0) > 0)
          .sort((a, b) => {
            const bumpA = bumpMap[a.address.toLowerCase()]?.lastBumpTime || 0;
            const bumpB = bumpMap[b.address.toLowerCase()]?.lastBumpTime || 0;
            return bumpB - bumpA;
          });
        break;
      case 'graduated':
        visibleTokens = visibleTokens.filter((t) => t.graduated);
        break;
      case 'rising':
        visibleTokens = visibleTokens
          .filter((t) => !t.graduated)
          .sort((a, b) => Number(b.plsReserve - a.plsReserve));
        break;
      case 'new':
        visibleTokens = visibleTokens.filter((t) => !t.graduated);
        break;
    }

    setTokens(visibleTokens);
    setIsLoading(false);
  }, [tokenAddresses, tokenData, hiddenTokens, filter, bumpMap]);

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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {[...Array(limit)].map((_, i) => (
            <Card key={i} variant="bordered" className="p-4 animate-pulse">
              <div className="flex gap-3">
                <div className="w-48 h-48 bg-dark-tertiary rounded-lg" />
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

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {tokens.map((token) => {
          const progressPercent = getProgressPercent(token.plsReserve);
          const shortAddress = `${token.address.slice(0, 6)}...${token.address.slice(-4)}`;
          const isBumped = wasBumpedRecently(token.address, 30);
          const isHot = bumpMap[token.address.toLowerCase()]?.isHot;

          return (
            <Link key={token.address} href={`/token/${token.address}`}>
              <Card
                variant="bordered"
                className={`p-4 transition-all cursor-pointer group h-full ${
                  isBumped
                    ? 'border-fud-green/70 shadow-[0_0_30px_rgba(0,255,0,0.5)] animate-pulse'
                    : 'hover:border-fud-green/50 hover:shadow-[0_0_25px_rgba(0,255,0,0.3)]'
                }`}
              >
                {/* VERTICAL LAYOUT - Image on top, info below */}

                {/* HUGE IMAGE - 192x192px centered */}
                <div className="w-full flex justify-center mb-4">
                  <div className="w-48 h-48 rounded-xl bg-dark-tertiary overflow-hidden flex items-center justify-center border-2 border-fud-green/50 shadow-[0_0_30px_rgba(0,255,0,0.4)]">
                    {token.imageUri ? (
                      <img
                        src={token.imageUri}
                        alt={token.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          (e.target as HTMLImageElement).parentElement!.innerHTML =
                            '<span class="text-7xl">🚀</span>';
                        }}
                      />
                    ) : (
                      <span className="text-7xl">🚀</span>
                    )}
                  </div>
                </div>

                {/* Name - HUGE and GLOWING */}
                <h3 className="font-display text-2xl font-bold text-center truncate group-hover:drop-shadow-[0_0_15px_rgba(0,255,0,1)] transition-all drop-shadow-[0_0_6px_rgba(0,255,0,0.6)]">
                  {token.name && token.name.includes('.') ? (
                    <>
                      <span className="text-fud-green-bright">{token.name.split('.')[0]}</span>
                      <span className="text-white">.{token.name.split('.').slice(1).join('.')}</span>
                    </>
                  ) : (
                    <span className="text-fud-green-bright">{token.name}</span>
                  )}
                </h3>

                {/* Symbol - GIANT YELLOW */}
                <p className="text-yellow-300 text-xl font-black font-mono tracking-wider text-center mt-1">{'$' + token.symbol.replace(/^\$+/, '')}</p>

                {/* Badges row - centered */}
                <div className="flex flex-wrap gap-2 mt-3 justify-center">
                  {token.graduated && (
                    <span className="px-3 py-1 bg-fud-orange/30 text-fud-orange text-xs font-mono font-bold rounded-full border border-fud-orange/50">
                      🎓 GRADUATED
                    </span>
                  )}
                  {isBumped && (
                    <span className="inline-flex items-center gap-1 px-3 py-1 bg-fud-green/30 text-fud-green text-xs font-mono font-bold rounded-full animate-pulse">
                      <Zap size={12} /> BUMPED
                    </span>
                  )}
                  {isHot && (
                    <span className="px-3 py-1 bg-orange-500/30 text-orange-400 text-xs font-mono font-bold rounded-full">
                      🔥 HOT
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="flex justify-center gap-6 mt-3 text-sm font-mono">
                  <div>
                    <span className="text-text-muted">Reserve: </span>
                    <span className="text-fud-green font-bold">{formatPLS(token.plsReserve)}</span>
                  </div>
                  <div>
                    <span className="text-text-muted">Activity: </span>
                    <span className={isBumped ? 'text-fud-green font-bold' : 'text-text-secondary'}>
                      {getTimeSinceBump(token.address)}
                    </span>
                  </div>
                </div>

                {/* Progress bar - only if not graduated */}
                {!token.graduated && (
                  <div className="mt-3">
                    <div className="flex justify-between text-xs font-mono mb-1">
                      <span className="text-text-muted">Progress</span>
                      <span className="text-fud-green font-bold">{progressPercent.toFixed(1)}%</span>
                    </div>
                    <div className="h-3 bg-dark-tertiary rounded-full overflow-hidden border border-fud-green/30">
                      <div
                        className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                )}

                {/* Contract address at bottom */}
                <div className="mt-3 pt-2 border-t border-dark-tertiary text-center">
                  <p className="text-xs font-mono text-text-muted">
                    CA: <span className="text-text-secondary">{shortAddress}</span>
                  </p>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
