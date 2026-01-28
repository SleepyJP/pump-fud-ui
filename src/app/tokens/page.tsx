'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useReadContract, useReadContracts } from 'wagmi';
import {
  TrendingUp,
  Zap,
  Trophy,
  Clock,
  Search,
  Grid,
  List,
  SlidersHorizontal,
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress } from '@/lib/utils';
import { useSiteSettings } from '@/stores/siteSettingsStore';

type FilterType = 'all' | 'rising' | 'new' | 'graduated';
type ViewType = 'grid' | 'list';

interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  graduated: boolean;
  createdAt?: number;
  volume24h?: bigint;
  priceChange?: number;
}

const FILTER_CONFIG: Record<FilterType, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: 'All Tokens', icon: <Grid size={16} />, color: 'text-fud-green' },
  rising: { label: 'Rising', icon: <TrendingUp size={16} />, color: 'text-fud-green' },
  new: { label: 'New', icon: <Zap size={16} />, color: 'text-fud-purple' },
  graduated: { label: 'Graduated', icon: <Trophy size={16} />, color: 'text-fud-orange' },
};

function TokensPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';

  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [view, setView] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const { tokenCardPattern, tokenCardPatternOpacity, hiddenTokens } = useSiteSettings();

  // V2: Fetch token addresses from factory
  const { data: tokenAddressesRaw, refetch, isRefetching } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // V2: Build multicall to get token data from each token contract
  const tokenDataContracts = (tokenAddressesRaw || []).flatMap((addr) => [
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'name' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'symbol' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'graduated' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'deleted' },
  ]);

  const { data: tokenData } = useReadContracts({
    contracts: tokenDataContracts as any,
    query: { enabled: tokenDataContracts.length > 0 },
  });

  // Load token details from V2 multicall
  useEffect(() => {
    if (!tokenAddressesRaw || tokenAddressesRaw.length === 0 || !tokenData) {
      setIsLoading(false);
      setTokens([]);
      return;
    }

    setIsLoading(true);
    const tokenInfos: TokenInfo[] = [];
    const fieldsPerToken = 4; // name, symbol, graduated, deleted

    for (let i = 0; i < tokenAddressesRaw.length; i++) {
      const baseIndex = i * fieldsPerToken;
      const addr = tokenAddressesRaw[i] as `0x${string}`;
      const name = tokenData[baseIndex]?.result as string;
      const symbol = tokenData[baseIndex + 1]?.result as string;
      const graduated = tokenData[baseIndex + 2]?.result as boolean || false;
      const deleted = tokenData[baseIndex + 3]?.result as boolean || false;

      // Skip deleted or hidden tokens
      if (deleted) continue;
      if (hiddenTokens.some((h) => h.toLowerCase() === addr.toLowerCase())) continue;

      if (name && symbol) {
        tokenInfos.push({
          address: addr,
          name,
          symbol,
          graduated,
          createdAt: 0, // V2 doesn't store createdAt
          priceChange: 0, // Would need price data
        });
      }
    }

    setTokens(tokenInfos);
    setIsLoading(false);
  }, [tokenAddressesRaw, tokenData, hiddenTokens]);

  // Filter and search tokens
  const filteredTokens = useMemo(() => {
    let result = [...tokens];

    // Apply filter
    switch (filter) {
      case 'rising':
        result = result.filter((t) => (t.priceChange || 0) > 0).sort((a, b) => (b.priceChange || 0) - (a.priceChange || 0));
        break;
      case 'new':
        result = result.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
        break;
      case 'graduated':
        result = result.filter((t) => t.graduated);
        break;
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(query) ||
          t.symbol.toLowerCase().includes(query) ||
          t.address.toLowerCase().includes(query)
      );
    }

    return result;
  }, [tokens, filter, searchQuery]);

  return (
    <div className="min-h-screen relative">
      {/* Full-bleed background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/backgrounds/live-tokens-bg.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
          zIndex: 0,
        }}
      />
      {/* Dark overlay for readability */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.5) 50%, rgba(0,0,0,0.7) 100%)',
          zIndex: 1,
        }}
      />
      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-3xl text-fud-green mb-1">Explore Tokens</h1>
            <p className="text-text-muted font-mono text-sm">
              {filteredTokens.length} tokens found
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => refetch()}
              variant="secondary"
              className="gap-2"
              disabled={isRefetching}
            >
              <RefreshCw size={16} className={isRefetching ? 'animate-spin' : ''} />
              Refresh
            </Button>
            <Link href="/">
              <Button className="gap-2">
                Launch Token
                <ArrowUpRight size={16} />
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          {/* Filter Tabs */}
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(FILTER_CONFIG) as FilterType[]).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                  filter === f
                    ? `bg-${f === 'all' ? 'fud-green' : f === 'rising' ? 'fud-green' : f === 'new' ? 'fud-purple' : 'fud-orange'}/20 ${FILTER_CONFIG[f].color} border border-current`
                    : 'bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-green/30'
                }`}
              >
                {FILTER_CONFIG[f].icon}
                {FILTER_CONFIG[f].label}
              </button>
            ))}
          </div>

          {/* Search & View Toggle */}
          <div className="flex gap-2 md:ml-auto">
            <div className="relative flex-1 md:w-64">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search tokens..."
                className="pl-10"
              />
            </div>
            <div className="flex bg-dark-secondary rounded-lg p-1 border border-border-primary">
              <button
                onClick={() => setView('grid')}
                className={`p-2 rounded ${view === 'grid' ? 'bg-fud-green/20 text-fud-green' : 'text-text-muted'}`}
              >
                <Grid size={16} />
              </button>
              <button
                onClick={() => setView('list')}
                className={`p-2 rounded ${view === 'list' ? 'bg-fud-green/20 text-fud-green' : 'text-text-muted'}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* Token List/Grid */}
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <div className="w-12 h-12 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-4" />
              <p className="text-text-muted font-mono">Loading tokens...</p>
            </div>
          </div>
        ) : filteredTokens.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 bg-dark-secondary rounded-full flex items-center justify-center mx-auto mb-4">
              <Search size={32} className="text-text-muted" />
            </div>
            <h3 className="font-display text-xl text-text-secondary mb-2">No tokens found</h3>
            <p className="text-text-muted font-mono text-sm mb-4">
              {searchQuery
                ? 'Try adjusting your search'
                : filter !== 'all'
                ? `No ${filter} tokens at the moment`
                : 'No tokens have been created yet'}
            </p>
            <Link href="/">
              <Button>Be the First to Launch</Button>
            </Link>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTokens.map((token) => (
              <Link key={token.address} href={`/token/${token.address}`}>
                <Card
                  variant="bordered"
                  className="h-full hover:border-fud-green/50 transition-all group relative overflow-hidden"
                >
                  {/* Pattern Background */}
                  {tokenCardPattern && (
                    <div
                      className="absolute inset-0 pointer-events-none"
                      style={{
                        backgroundImage: `url(${tokenCardPattern})`,
                        backgroundSize: tokenCardPattern.includes('gradient') ? '100% 100%' : '50px 50px',
                        opacity: tokenCardPatternOpacity / 100,
                      }}
                    />
                  )}

                  <CardContent className="p-4 relative z-10">
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 bg-fud-green/20 rounded-xl flex items-center justify-center">
                        <span className="font-display text-fud-green text-lg">
                          {token.symbol.slice(0, 2)}
                        </span>
                      </div>
                      {token.graduated && (
                        <span className="px-2 py-1 bg-fud-orange/20 text-fud-orange text-xs font-mono rounded-full flex items-center gap-1">
                          <Trophy size={10} />
                          GRADUATED
                        </span>
                      )}
                    </div>

                    <h3 className="font-display text-lg text-text-primary mb-1 group-hover:text-fud-green transition-colors">
                      {token.name}
                    </h3>
                    <p className="text-text-muted text-sm font-mono mb-3">${token.symbol}</p>

                    <div className="flex justify-between items-center text-sm">
                      <span className="text-text-muted font-mono">
                        {formatAddress(token.address)}
                      </span>
                      <span
                        className={`flex items-center gap-1 font-mono ${
                          (token.priceChange || 0) >= 0 ? 'text-fud-green' : 'text-fud-red'
                        }`}
                      >
                        {(token.priceChange || 0) >= 0 ? (
                          <ArrowUpRight size={14} />
                        ) : (
                          <ArrowDownRight size={14} />
                        )}
                        {Math.abs(token.priceChange || 0).toFixed(1)}%
                      </span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <div className="space-y-2">
            {filteredTokens.map((token) => (
              <Link key={token.address} href={`/token/${token.address}`}>
                <Card
                  variant="bordered"
                  className="hover:border-fud-green/50 transition-all group"
                >
                  <CardContent className="p-4 flex items-center gap-4">
                    <div className="w-12 h-12 bg-fud-green/20 rounded-xl flex items-center justify-center">
                      <span className="font-display text-fud-green text-lg">
                        {token.symbol.slice(0, 2)}
                      </span>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-lg text-text-primary group-hover:text-fud-green transition-colors">
                          {token.name}
                        </h3>
                        {token.graduated && (
                          <Trophy size={14} className="text-fud-orange" />
                        )}
                      </div>
                      <p className="text-text-muted text-sm font-mono">
                        ${token.symbol} • {formatAddress(token.address)}
                      </p>
                    </div>

                    <div className="text-right">
                      <span
                        className={`flex items-center gap-1 font-mono text-lg ${
                          (token.priceChange || 0) >= 0 ? 'text-fud-green' : 'text-fud-red'
                        }`}
                      >
                        {(token.priceChange || 0) >= 0 ? (
                          <ArrowUpRight size={18} />
                        ) : (
                          <ArrowDownRight size={18} />
                        )}
                        {Math.abs(token.priceChange || 0).toFixed(1)}%
                      </span>
                      <p className="text-text-muted text-xs font-mono">24h</p>
                    </div>

                    <ExternalLink size={16} className="text-text-muted group-hover:text-fud-green transition-colors" />
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TokensPageLoading() {
  return (
    <div className="min-h-screen relative flex items-center justify-center" style={{
      backgroundImage: 'url(/backgrounds/live-tokens-bg.jpg)',
      backgroundSize: 'cover',
      backgroundPosition: 'center',
    }}>
      <div className="text-center">
        <div className="w-12 h-12 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-4" />
        <p className="text-text-muted font-mono">Loading tokens...</p>
      </div>
    </div>
  );
}

export default function TokensPage() {
  return (
    <Suspense fallback={<TokensPageLoading />}>
      <TokensPageContent />
    </Suspense>
  );
}
