'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import { User } from 'lucide-react';
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

  const filterTitles: Record<FilterType, string> = {
    live: 'Live Tokens',
    rising: 'Rising Tokens',
    new: 'New Tokens',
    graduated: 'Graduated Tokens',
  };

  // V1 Factory: tokenCount + tokens(index)
  const { data: tokenCount } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'tokenCount',
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // Build multicall to fetch each token address by index
  const tokenIndexContracts = Array.from({ length: Math.min(Number(tokenCount || 0), limit) }, (_, i) => ({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'tokens',
    args: [BigInt(i)],
  }));

  const { data: tokenAddressResults } = useReadContracts({
    contracts: tokenIndexContracts as any,
    query: { enabled: Number(tokenCount || 0) > 0 },
  });

  // Extract addresses from multicall results
  const tokenAddresses = (tokenAddressResults || [])
    .map((r) => r.result as `0x${string}`)
    .filter(Boolean);

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

    // Apply filter
    switch (filter) {
      case 'live':
        visibleTokens = visibleTokens.filter((t) => !t.graduated);
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
  }, [tokenAddresses, tokenData, hiddenTokens, filter]);

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

                  <div className="flex-1 min-w-0">
                    <h3 className="font-display truncate group-hover:animate-glow">
                      {token.name && token.name.includes('.') ? (
                        <>
                          <span className="text-fud-green" style={{ textShadow: '0 0 8px #00ff88' }}>
                            {token.name.split('.')[0]}
                          </span>
                          <span className="text-white" style={{ textShadow: '0 0 8px #ffffff' }}>
                            .{token.name.split('.').slice(1).join('.')}
                          </span>
                        </>
                      ) : (
                        <span className="text-fud-green">{token.name}</span>
                      )}
                    </h3>
                    <p className="text-white text-sm font-mono">{token.symbol}</p>
                    {token.graduated && (
                      <span className="inline-block mt-1 px-2 py-0.5 bg-fud-orange/20 text-fud-orange text-[10px] font-mono rounded">
                        GRADUATED
                      </span>
                    )}
                  </div>
                </div>

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

                {!token.graduated && (
                  <div>
                    <div className="flex justify-between text-[10px] font-mono mb-1">
                      <span className="text-text-muted">Bonding Progress</span>
                      <span className="text-fud-green">
                        {progressPercent.toFixed(1)}% to BOND
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
