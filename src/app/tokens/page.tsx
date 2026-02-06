'use client';

import { useState, useEffect, useMemo, useCallback, Suspense } from 'react';
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
  ArrowUpRight,
  ArrowDownRight,
  ExternalLink,
  RefreshCw,
  Gift,
  Crown,
  Flame,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import { useBumpTracking, type BumpData } from '@/hooks/useBumpTracking';

type FilterType = 'all' | 'bumped' | 'rising' | 'new' | 'graduated' | 'tax';
type ViewType = 'grid' | 'list';

function detectTaxToken(description: string | undefined): boolean {
  if (!description) return false;
  try {
    const parsed = JSON.parse(description);
    return parsed?.taxConfig !== undefined && parsed.taxConfig !== null;
  } catch {
    return false;
  }
}

interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  graduated: boolean;
  imageUri?: string;
  description?: string;
  isTaxToken?: boolean;
  plsReserve: bigint;
  currentPrice: bigint;
  graduationProgress: number;
  creator: `0x${string}`;
}

const FILTER_CONFIG: Record<FilterType, { label: string; icon: React.ReactNode; color: string }> = {
  all: { label: 'All Tokens', icon: <Grid size={16} />, color: 'text-fud-green' },
  bumped: { label: 'Bumped', icon: <Zap size={16} />, color: 'text-yellow-400' },
  rising: { label: 'Rising', icon: <TrendingUp size={16} />, color: 'text-fud-green' },
  new: { label: 'New', icon: <Clock size={16} />, color: 'text-fud-purple' },
  graduated: { label: 'Graduated', icon: <Trophy size={16} />, color: 'text-fud-orange' },
  tax: { label: 'Tax Tokens', icon: <Gift size={16} />, color: 'text-fud-purple' },
};

function TokensPageContent() {
  const searchParams = useSearchParams();
  const initialFilter = (searchParams.get('filter') as FilterType) || 'all';

  const [filter, setFilter] = useState<FilterType>(initialFilter);
  const [view, setView] = useState<ViewType>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [tokens, setTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  const { tokenCardPattern, tokenCardPatternOpacity, hiddenTokens } = useSiteSettings();

  // Tick every 5s so "Xs ago" timestamps stay fresh
  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch token addresses from factory
  const { data: tokenAddressesRaw, refetch, isRefetching } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(200)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // Build multicall for token data
  const tokenDataContracts = (tokenAddressesRaw || []).flatMap((addr) => [
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'name' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'symbol' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'graduated' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'deleted' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'imageUri' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'description' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'plsReserve' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'getCurrentPrice' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'getGraduationProgress' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'creator' },
  ]);

  const { data: tokenData } = useReadContracts({
    contracts: tokenDataContracts as any,
    query: { enabled: tokenDataContracts.length > 0 },
  });

  // BUMP TRACKING — real-time on-chain event watching
  const tokenAddressList = useMemo(
    () => (tokenAddressesRaw || []) as `0x${string}`[],
    [tokenAddressesRaw]
  );
  const { bumpMap, getTimeSinceBump, wasBumpedRecently } = useBumpTracking(tokenAddressList);

  // Process token data from multicall
  useEffect(() => {
    if (!tokenAddressesRaw || tokenAddressesRaw.length === 0 || !tokenData) {
      setIsLoading(false);
      setTokens([]);
      return;
    }

    setIsLoading(true);
    const tokenInfos: TokenInfo[] = [];
    const fieldsPerToken = 10;

    for (let i = 0; i < tokenAddressesRaw.length; i++) {
      const baseIndex = i * fieldsPerToken;
      const addr = tokenAddressesRaw[i] as `0x${string}`;
      const name = tokenData[baseIndex]?.result as string;
      const symbol = tokenData[baseIndex + 1]?.result as string;
      const graduated = (tokenData[baseIndex + 2]?.result as boolean) || false;
      const deleted = (tokenData[baseIndex + 3]?.result as boolean) || false;
      const imageUri = (tokenData[baseIndex + 4]?.result as string) || '';
      const description = (tokenData[baseIndex + 5]?.result as string) || '';
      const plsReserve = (tokenData[baseIndex + 6]?.result as bigint) || BigInt(0);
      const currentPrice = (tokenData[baseIndex + 7]?.result as bigint) || BigInt(0);
      const graduationProgress = (tokenData[baseIndex + 8]?.result as bigint) || BigInt(0);
      const creator = (tokenData[baseIndex + 9]?.result as `0x${string}`) || '0x0000000000000000000000000000000000000000';

      if (deleted) continue;
      if (hiddenTokens.some((h) => h.toLowerCase() === addr.toLowerCase())) continue;

      if (name && symbol) {
        tokenInfos.push({
          address: addr,
          name,
          symbol,
          graduated,
          imageUri,
          description,
          isTaxToken: detectTaxToken(description),
          plsReserve,
          currentPrice,
          graduationProgress: Number(graduationProgress),
          creator,
        });
      }
    }

    setTokens(tokenInfos);
    setIsLoading(false);
  }, [tokenAddressesRaw, tokenData, hiddenTokens]);

  // King of the Hill — hottest token right now
  const kingOfTheHill = useMemo(() => {
    if (tokens.length === 0 || Object.keys(bumpMap).length === 0) return null;

    let king: TokenInfo | null = null;
    let kingBumps = 0;
    let kingLastBump = 0;

    for (const token of tokens) {
      if (token.graduated) continue;
      const bump = bumpMap[token.address.toLowerCase()];
      if (!bump) continue;

      // Priority: most recent bumps in 5 min, then most recent bump time
      if (
        bump.recentBumps > kingBumps ||
        (bump.recentBumps === kingBumps && bump.lastBumpTime > kingLastBump)
      ) {
        king = token;
        kingBumps = bump.recentBumps;
        kingLastBump = bump.lastBumpTime;
      }
    }

    // Only crown a king if there's been activity in the last 10 minutes
    if (king && kingLastBump > 0 && now - kingLastBump < 600) {
      return king;
    }
    return null;
  }, [tokens, bumpMap, now]);

  // Filter and sort tokens with bump integration
  const filteredTokens = useMemo(() => {
    let result = [...tokens];

    switch (filter) {
      case 'all':
        // Default: sort by most recent bump, then by reserve
        result.sort((a, b) => {
          const bumpA = bumpMap[a.address.toLowerCase()]?.lastBumpTime || 0;
          const bumpB = bumpMap[b.address.toLowerCase()]?.lastBumpTime || 0;
          if (bumpB !== bumpA) return bumpB - bumpA;
          return Number(b.plsReserve - a.plsReserve);
        });
        break;
      case 'bumped':
        // Only show tokens with recent activity, sorted by most recent
        result = result
          .filter((t) => {
            const bump = bumpMap[t.address.toLowerCase()];
            return bump && bump.lastBumpTime > 0 && now - bump.lastBumpTime < 1800; // 30 min
          })
          .sort((a, b) => {
            const bumpA = bumpMap[a.address.toLowerCase()]?.lastBumpTime || 0;
            const bumpB = bumpMap[b.address.toLowerCase()]?.lastBumpTime || 0;
            return bumpB - bumpA;
          });
        break;
      case 'rising':
        result = result
          .filter((t) => !t.graduated)
          .sort((a, b) => Number(b.plsReserve - a.plsReserve));
        break;
      case 'new':
        // Reverse order = newest first (factory returns oldest first)
        result = result.filter((t) => !t.graduated).reverse();
        break;
      case 'graduated':
        result = result.filter((t) => t.graduated);
        break;
      case 'tax':
        result = result.filter((t) => t.isTaxToken);
        break;
    }

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
  }, [tokens, filter, searchQuery, bumpMap, now]);

  // Stats
  const totalBumped = useMemo(() => {
    return tokens.filter((t) => {
      const bump = bumpMap[t.address.toLowerCase()];
      return bump && bump.lastBumpTime > 0 && now - bump.lastBumpTime < 300;
    }).length;
  }, [tokens, bumpMap, now]);

  const totalHot = useMemo(() => {
    return tokens.filter((t) => bumpMap[t.address.toLowerCase()]?.isHot).length;
  }, [tokens, bumpMap]);

  // Helper: get bump glow class for a token
  const getBumpStyles = useCallback(
    (address: string): string => {
      const bump = bumpMap[address.toLowerCase()];
      if (!bump || bump.lastBumpTime === 0) return '';

      const age = now - bump.lastBumpTime;

      if (age < 10) {
        // Just bumped — intense glow + pulse
        return 'border-fud-green shadow-[0_0_40px_rgba(0,255,0,0.7)] animate-pulse';
      }
      if (age < 30) {
        // Recently bumped — strong glow
        return 'border-fud-green/80 shadow-[0_0_25px_rgba(0,255,0,0.5)]';
      }
      if (bump.isHot) {
        // Hot — orange glow
        return 'border-orange-400/70 shadow-[0_0_20px_rgba(255,165,0,0.4)]';
      }
      if (age < 300) {
        // Active in last 5 min — subtle glow
        return 'border-fud-green/50 shadow-[0_0_15px_rgba(0,255,0,0.2)]';
      }
      return '';
    },
    [bumpMap, now]
  );

  const getProgressPercent = (reserve: bigint): number => {
    if (!reserve) return 0;
    const threshold = BigInt('50000000000000000000000000'); // 50M PLS
    return Math.min(Number((reserve * BigInt(100)) / threshold), 100);
  };

  return (
    <div className="min-h-screen relative">
      {/* Background */}
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
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'linear-gradient(180deg, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.55) 50%, rgba(0,0,0,0.75) 100%)',
          zIndex: 1,
        }}
      />

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="font-display text-3xl text-fud-green mb-1">Live Tokens</h1>
            <p className="text-text-muted font-mono text-sm flex items-center gap-3">
              <span>{filteredTokens.length} tokens</span>
              {totalBumped > 0 && (
                <span className="inline-flex items-center gap-1 text-fud-green">
                  <Zap size={12} className="animate-pulse" /> {totalBumped} active now
                </span>
              )}
              {totalHot > 0 && (
                <span className="inline-flex items-center gap-1 text-orange-400">
                  <Flame size={12} /> {totalHot} hot
                </span>
              )}
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
            <Link href="/launch">
              <Button className="gap-2">
                Launch Token
                <ArrowUpRight size={16} />
              </Button>
            </Link>
          </div>
        </div>

        {/* KING OF THE HILL */}
        {kingOfTheHill && (
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-3">
              <Crown size={20} className="text-yellow-400" />
              <h2 className="font-display text-lg text-yellow-400">King of the Hill</h2>
              <span className="text-text-muted font-mono text-xs">Most active right now</span>
            </div>
            <Link href={`/token/${kingOfTheHill.address}`}>
              <Card
                variant="bordered"
                className="border-yellow-400/60 shadow-[0_0_40px_rgba(255,215,0,0.3)] hover:shadow-[0_0_60px_rgba(255,215,0,0.5)] transition-all group relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-yellow-400/5 via-transparent to-yellow-400/5 pointer-events-none" />
                <CardContent className="p-6 relative z-10">
                  <div className="flex items-center gap-6">
                    {/* Crown Image */}
                    <div className="relative">
                      <div className="w-20 h-20 rounded-xl overflow-hidden border-2 border-yellow-400/60 bg-black/40 shadow-[0_0_20px_rgba(255,215,0,0.3)]">
                        {kingOfTheHill.imageUri ? (
                          <img
                            src={kingOfTheHill.imageUri}
                            alt={kingOfTheHill.name}
                            className="w-full h-full object-cover"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                              (e.target as HTMLImageElement).parentElement!.innerHTML =
                                '<span class="text-4xl flex items-center justify-center w-full h-full">👑</span>';
                            }}
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <span className="text-4xl">👑</span>
                          </div>
                        )}
                      </div>
                      <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center shadow-lg">
                        <Crown size={14} className="text-black" />
                      </div>
                    </div>

                    {/* King Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <h3 className="font-display text-2xl text-yellow-300 group-hover:text-yellow-200 transition-colors truncate">
                          {kingOfTheHill.name}
                        </h3>
                        <span className="text-yellow-400 font-mono font-bold text-lg">${kingOfTheHill.symbol}</span>
                      </div>
                      <div className="flex items-center gap-4 font-mono text-sm">
                        <span className="text-text-muted">
                          Reserve: <span className="text-fud-green font-bold">{formatPLS(kingOfTheHill.plsReserve)}</span>
                        </span>
                        <span className="text-text-muted">
                          Activity: <span className="text-yellow-400 font-bold">{getTimeSinceBump(kingOfTheHill.address)}</span>
                        </span>
                        {bumpMap[kingOfTheHill.address.toLowerCase()]?.recentBumps > 0 && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 rounded-full text-xs font-bold">
                            <Flame size={10} />
                            {bumpMap[kingOfTheHill.address.toLowerCase()]?.recentBumps} bumps in 5m
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Progress */}
                    <div className="hidden md:block w-40">
                      <div className="flex justify-between text-xs font-mono mb-1">
                        <span className="text-text-muted">Progress</span>
                        <span className="text-yellow-400 font-bold">{getProgressPercent(kingOfTheHill.plsReserve).toFixed(1)}%</span>
                      </div>
                      <div className="h-3 bg-dark-tertiary rounded-full overflow-hidden border border-yellow-400/30">
                        <div
                          className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 transition-all duration-500"
                          style={{ width: `${getProgressPercent(kingOfTheHill.plsReserve)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          </div>
        )}

        {/* Filters Bar */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(FILTER_CONFIG) as FilterType[]).map((f) => {
              const cfg = FILTER_CONFIG[f];
              return (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                    filter === f
                      ? `bg-white/10 ${cfg.color} border border-current`
                      : 'bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-green/30'
                  }`}
                >
                  {cfg.icon}
                  {cfg.label}
                  {f === 'bumped' && totalBumped > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-yellow-400/20 text-yellow-400 text-xs rounded-full font-bold">
                      {totalBumped}
                    </span>
                  )}
                </button>
              );
            })}
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

        {/* Token Grid/List */}
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
                : filter === 'bumped'
                ? 'No tokens bumped recently — be the first to buy!'
                : filter !== 'all'
                ? `No ${filter} tokens at the moment`
                : 'No tokens have been created yet'}
            </p>
            <Link href="/launch">
              <Button>Be the First to Launch</Button>
            </Link>
          </div>
        ) : view === 'grid' ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredTokens.map((token) => {
              const progressPercent = getProgressPercent(token.plsReserve);
              const isBumped = wasBumpedRecently(token.address, 30);
              const isHot = bumpMap[token.address.toLowerCase()]?.isHot;
              const bumpAge = bumpMap[token.address.toLowerCase()]?.lastBumpTime
                ? now - bumpMap[token.address.toLowerCase()].lastBumpTime
                : Infinity;
              const bumpGlow = getBumpStyles(token.address);

              return (
                <Link key={token.address} href={`/token/${token.address}`}>
                  <Card
                    variant="bordered"
                    className={`h-full transition-all cursor-pointer group relative overflow-hidden ${
                      bumpGlow || 'hover:border-fud-green/50 hover:shadow-[0_0_25px_rgba(0,255,0,0.2)]'
                    }`}
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

                    {/* Bump flash overlay */}
                    {bumpAge < 10 && (
                      <div className="absolute inset-0 bg-fud-green/10 animate-pulse pointer-events-none z-0" />
                    )}

                    <CardContent className="p-4 relative z-10">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-14 h-14 rounded-xl overflow-hidden border border-fud-green/30 bg-black/40 flex-shrink-0">
                          {token.imageUri ? (
                            <img
                              src={token.imageUri}
                              alt={token.name}
                              className="w-full h-full object-cover"
                              onError={(e) => {
                                (e.target as HTMLImageElement).style.display = 'none';
                                (e.target as HTMLImageElement).parentElement!.innerHTML =
                                  `<span class="font-display text-fud-green text-lg flex items-center justify-center w-full h-full">${token.symbol.slice(0, 2)}</span>`;
                              }}
                            />
                          ) : (
                            <div className="w-full h-full bg-fud-green/20 flex items-center justify-center">
                              <span className="font-display text-fud-green text-lg">
                                {token.symbol.slice(0, 2)}
                              </span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 items-end">
                          {isBumped && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fud-green/20 text-fud-green text-xs font-mono font-bold rounded-full animate-pulse">
                              <Zap size={10} /> BUMPED
                            </span>
                          )}
                          {isHot && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-orange-500/20 text-orange-400 text-xs font-mono font-bold rounded-full">
                              <Flame size={10} /> HOT
                            </span>
                          )}
                          {token.graduated && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fud-orange/20 text-fud-orange text-xs font-mono rounded-full">
                              <Trophy size={10} /> GRAD
                            </span>
                          )}
                          {token.isTaxToken && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-fud-purple/20 text-fud-purple text-xs font-mono rounded-full">
                              <Gift size={10} /> TAX
                            </span>
                          )}
                        </div>
                      </div>

                      <h3 className="font-display text-lg text-text-primary mb-0.5 group-hover:text-fud-green transition-colors truncate">
                        {token.name}
                      </h3>
                      <p className="text-yellow-300 text-sm font-mono font-bold mb-2">${token.symbol}</p>

                      {/* Activity + Reserve */}
                      <div className="flex justify-between items-center text-xs font-mono mb-2">
                        <span className="text-text-muted">
                          Reserve: <span className="text-fud-green">{formatPLS(token.plsReserve)}</span>
                        </span>
                        <span className={isBumped ? 'text-fud-green font-bold' : 'text-text-muted'}>
                          {getTimeSinceBump(token.address)}
                        </span>
                      </div>

                      {/* Recent bumps count */}
                      {bumpMap[token.address.toLowerCase()]?.recentBumps > 0 && (
                        <div className="flex items-center gap-1 text-xs font-mono text-orange-400 mb-2">
                          <Flame size={10} />
                          <span>{bumpMap[token.address.toLowerCase()].recentBumps} buys in 5m</span>
                        </div>
                      )}

                      {/* Progress bar */}
                      {!token.graduated && (
                        <div>
                          <div className="flex justify-between text-xs font-mono mb-1">
                            <span className="text-text-muted">Progress</span>
                            <span className="text-fud-green font-bold">{progressPercent.toFixed(1)}%</span>
                          </div>
                          <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden border border-fud-green/20">
                            <div
                              className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                        </div>
                      )}

                      {/* Contract address */}
                      <div className="mt-2 pt-2 border-t border-dark-tertiary">
                        <p className="text-xs font-mono text-text-muted">
                          {formatAddress(token.address)}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        ) : (
          /* LIST VIEW */
          <div className="space-y-2">
            {filteredTokens.map((token) => {
              const progressPercent = getProgressPercent(token.plsReserve);
              const isBumped = wasBumpedRecently(token.address, 30);
              const isHot = bumpMap[token.address.toLowerCase()]?.isHot;
              const bumpGlow = getBumpStyles(token.address);

              return (
                <Link key={token.address} href={`/token/${token.address}`}>
                  <Card
                    variant="bordered"
                    className={`transition-all group ${
                      bumpGlow || 'hover:border-fud-green/50'
                    }`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Image */}
                      <div className="w-12 h-12 rounded-xl overflow-hidden border border-fud-green/30 bg-black/40 flex-shrink-0">
                        {token.imageUri ? (
                          <img
                            src={token.imageUri}
                            alt={token.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-fud-green/20 flex items-center justify-center">
                            <span className="font-display text-fud-green text-lg">
                              {token.symbol.slice(0, 2)}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Name + Symbol */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg text-text-primary group-hover:text-fud-green transition-colors truncate">
                            {token.name}
                          </h3>
                          <span className="text-yellow-300 font-mono font-bold text-sm">${token.symbol}</span>
                          {token.graduated && <Trophy size={14} className="text-fud-orange flex-shrink-0" />}
                          {token.isTaxToken && <Gift size={14} className="text-fud-purple flex-shrink-0" />}
                        </div>
                        <p className="text-text-muted text-xs font-mono">
                          {formatAddress(token.address)}
                          {' · '}
                          Reserve: {formatPLS(token.plsReserve)}
                        </p>
                      </div>

                      {/* Bump Badges */}
                      <div className="flex items-center gap-2 flex-shrink-0">
                        {isBumped && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-fud-green/20 text-fud-green text-xs font-mono font-bold rounded-full animate-pulse">
                            <Zap size={10} /> BUMPED
                          </span>
                        )}
                        {isHot && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 text-xs font-mono font-bold rounded-full">
                            <Flame size={10} /> HOT
                          </span>
                        )}
                      </div>

                      {/* Activity Time */}
                      <div className="text-right flex-shrink-0 w-24">
                        <span className={`font-mono text-sm ${isBumped ? 'text-fud-green font-bold' : 'text-text-muted'}`}>
                          {getTimeSinceBump(token.address)}
                        </span>
                        {bumpMap[token.address.toLowerCase()]?.recentBumps > 0 && (
                          <p className="text-xs font-mono text-orange-400">
                            {bumpMap[token.address.toLowerCase()].recentBumps} in 5m
                          </p>
                        )}
                      </div>

                      {/* Progress mini-bar */}
                      {!token.graduated && (
                        <div className="w-20 flex-shrink-0">
                          <div className="h-2 bg-dark-tertiary rounded-full overflow-hidden">
                            <div
                              className="h-full bg-fud-green transition-all"
                              style={{ width: `${progressPercent}%` }}
                            />
                          </div>
                          <p className="text-xs font-mono text-text-muted text-center mt-0.5">
                            {progressPercent.toFixed(0)}%
                          </p>
                        </div>
                      )}

                      <ExternalLink size={16} className="text-text-muted group-hover:text-fud-green transition-colors flex-shrink-0" />
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function TokensPageLoading() {
  return (
    <div
      className="min-h-screen relative flex items-center justify-center"
      style={{
        backgroundImage: 'url(/backgrounds/live-tokens-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
      }}
    >
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
