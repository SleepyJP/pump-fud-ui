'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useReadContract, useReadContracts } from 'wagmi';
import { Crown, Flame, TrendingUp, ExternalLink } from 'lucide-react';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS, CONSTANTS } from '@/config/wagmi';
import { formatPLS } from '@/lib/utils';
import { useBumpTracking } from '@/hooks/useBumpTracking';
import { useSiteSettings } from '@/stores/siteSettingsStore';

const TokenDashboard = dynamic(
  () => import('@/components/dashboard/TokenDashboard').then(mod => mod.TokenDashboard || mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-yellow-400 text-lg animate-pulse font-display">Finding THE FUDFATHER...</span>
        </div>
      </div>
    ),
  }
);

interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  graduated: boolean;
  imageUri: string;
  plsReserve: bigint;
  currentPrice: bigint;
}

export default function FudfatherPage() {
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));
  const { hiddenTokens } = useSiteSettings();

  useEffect(() => {
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 5000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all token addresses from factory
  const { data: tokenAddressesRaw } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(200)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  // Multicall for token data
  const tokenDataContracts = (tokenAddressesRaw || []).flatMap((addr) => [
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'name' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'symbol' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'graduated' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'deleted' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'imageUri' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'plsReserve' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'getCurrentPrice' },
  ]);

  const { data: tokenData } = useReadContracts({
    contracts: tokenDataContracts as any,
    query: { enabled: tokenDataContracts.length > 0 },
  });

  // Build tokens list
  const tokens = useMemo(() => {
    if (!tokenAddressesRaw || !tokenData) return [];
    const result: TokenInfo[] = [];
    const fieldsPerToken = 7;

    for (let i = 0; i < tokenAddressesRaw.length; i++) {
      const base = i * fieldsPerToken;
      const addr = tokenAddressesRaw[i] as `0x${string}`;
      const name = tokenData[base]?.result as string;
      const symbol = tokenData[base + 1]?.result as string;
      const graduated = (tokenData[base + 2]?.result as boolean) || false;
      const deleted = (tokenData[base + 3]?.result as boolean) || false;
      const imageUri = (tokenData[base + 4]?.result as string) || '';
      const plsReserve = (tokenData[base + 5]?.result as bigint) || 0n;
      const currentPrice = (tokenData[base + 6]?.result as bigint) || 0n;

      if (deleted) continue;
      if (hiddenTokens.some((h) => h.toLowerCase() === addr.toLowerCase())) continue;
      if (!name || !symbol) continue;

      result.push({ address: addr, name, symbol, graduated, imageUri, plsReserve, currentPrice });
    }
    return result;
  }, [tokenAddressesRaw, tokenData, hiddenTokens]);

  // Bump tracking
  const tokenAddressList = useMemo(
    () => (tokenAddressesRaw || []) as `0x${string}`[],
    [tokenAddressesRaw]
  );
  const { bumpMap, getTimeSinceBump } = useBumpTracking(tokenAddressList);

  // FUDFATHER = King of the Hill (hottest non-graduated token)
  // Fallback: highest PLS reserve non-graduated token
  const fudfather = useMemo(() => {
    if (tokens.length === 0) return null;

    // Try bump-based king first
    if (Object.keys(bumpMap).length > 0) {
      let king: TokenInfo | null = null;
      let kingBumps = 0;
      let kingLastBump = 0;

      for (const token of tokens) {
        if (token.graduated) continue;
        const bump = bumpMap[token.address.toLowerCase()];
        if (!bump) continue;

        if (
          bump.recentBumps > kingBumps ||
          (bump.recentBumps === kingBumps && bump.lastBumpTime > kingLastBump)
        ) {
          king = token;
          kingBumps = bump.recentBumps;
          kingLastBump = bump.lastBumpTime;
        }
      }

      // Only crown if activity in last 10 minutes
      if (king && kingLastBump > 0 && now - kingLastBump < 600) {
        return { token: king, bumps: kingBumps, lastBump: kingLastBump, method: 'bumps' as const };
      }
    }

    // Fallback: highest reserve non-graduated token
    let topToken: TokenInfo | null = null;
    let topReserve = 0n;
    for (const token of tokens) {
      if (token.graduated) continue;
      if (token.plsReserve > topReserve) {
        topToken = token;
        topReserve = token.plsReserve;
      }
    }

    if (topToken) {
      const bump = bumpMap[topToken.address.toLowerCase()];
      return {
        token: topToken,
        bumps: bump?.recentBumps || 0,
        lastBump: bump?.lastBumpTime || 0,
        method: 'reserve' as const,
      };
    }

    return null;
  }, [tokens, bumpMap, now]);

  // Runners up (next 4 tokens by bump activity or reserve)
  const runnersUp = useMemo(() => {
    if (!fudfather || tokens.length < 2) return [];

    const nonGraduated = tokens.filter(t => !t.graduated && t.address !== fudfather.token.address);

    return nonGraduated
      .sort((a, b) => {
        const bumpA = bumpMap[a.address.toLowerCase()];
        const bumpB = bumpMap[b.address.toLowerCase()];
        const bumpsA = bumpA?.recentBumps || 0;
        const bumpsB = bumpB?.recentBumps || 0;
        if (bumpsA !== bumpsB) return bumpsB - bumpsA;
        return Number((b.plsReserve || 0n) - (a.plsReserve || 0n));
      })
      .slice(0, 4);
  }, [tokens, fudfather, bumpMap]);

  // Loading state
  if (!tokenAddressesRaw || !tokenData) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-yellow-400 border-t-transparent rounded-full animate-spin" />
          <span className="text-yellow-400 text-lg animate-pulse font-display">Finding THE FUDFATHER...</span>
        </div>
      </div>
    );
  }

  // No tokens at all
  if (!fudfather) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Crown size={48} className="text-yellow-400/50 mx-auto mb-4" />
          <h1 className="font-display text-2xl text-yellow-400 mb-2">No FUDFATHER Yet</h1>
          <p className="text-gray-500 font-mono text-sm mb-4">The throne is empty. Be the first to trade.</p>
          <Link href="/tokens" className="text-[#d6ffe0] hover:underline font-mono text-sm">
            Browse Tokens →
          </Link>
        </div>
      </div>
    );
  }

  const GRADUATION_THRESHOLD = CONSTANTS.GRADUATION_THRESHOLD;
  const progress = fudfather.token.plsReserve
    ? Math.min(100, Number(fudfather.token.plsReserve * 100n / GRADUATION_THRESHOLD))
    : 0;

  return (
    <div className="min-h-screen bg-black flex flex-col">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FUDFATHER CROWN BANNER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="bg-gradient-to-r from-yellow-400/10 via-yellow-400/20 to-yellow-400/10 border-b border-yellow-400/30">
        <div className="max-w-screen-2xl mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Left: Title + Token Info */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Crown size={24} className="text-yellow-400" />
                <h1 className="font-display text-xl text-yellow-400 font-bold tracking-wide">THE FUDFATHER</h1>
              </div>
              <div className="hidden sm:flex items-center gap-3">
                <div className="w-px h-6 bg-yellow-400/30" />
                {fudfather.token.imageUri && (
                  <img
                    src={fudfather.token.imageUri}
                    alt={fudfather.token.name}
                    className="w-8 h-8 rounded-lg border border-yellow-400/40 object-cover"
                  />
                )}
                <div>
                  <span className="text-white font-bold text-sm">{fudfather.token.name}</span>
                  <span className="text-yellow-400 font-mono text-xs ml-2">
                    ${fudfather.token.symbol.replace(/^\$+/, '')}
                  </span>
                </div>
              </div>
            </div>

            {/* Center: Stats */}
            <div className="flex items-center gap-4 font-mono text-xs">
              {fudfather.method === 'bumps' && fudfather.bumps > 0 && (
                <span className="flex items-center gap-1 px-2 py-1 bg-orange-500/20 text-orange-400 rounded-full font-bold">
                  <Flame size={12} />
                  {fudfather.bumps} bumps in 5m
                </span>
              )}
              <span className="text-gray-400">
                Reserve: <span className="text-[#d6ffe0] font-bold">{formatPLS(fudfather.token.plsReserve)}</span>
              </span>
              <span className="text-gray-400">
                Progress: <span className="text-yellow-400 font-bold">{progress.toFixed(1)}%</span>
              </span>
              {fudfather.lastBump > 0 && (
                <span className="text-gray-400">
                  Last trade: <span className="text-yellow-400">{getTimeSinceBump(fudfather.token.address)}</span>
                </span>
              )}
            </div>

            {/* Right: View on tokens page */}
            <Link
              href={`/token/${fudfather.token.address}`}
              className="flex items-center gap-1 text-xs font-mono text-gray-400 hover:text-yellow-400 transition-colors"
            >
              Direct link <ExternalLink size={10} />
            </Link>
          </div>

          {/* Runners Up Row */}
          {runnersUp.length > 0 && (
            <div className="flex items-center gap-2 mt-2 pt-2 border-t border-yellow-400/10">
              <span className="text-[10px] text-gray-500 font-mono uppercase">Contenders:</span>
              {runnersUp.map((t) => {
                const bump = bumpMap[t.address.toLowerCase()];
                return (
                  <Link
                    key={t.address}
                    href={`/token/${t.address}`}
                    className="flex items-center gap-1.5 px-2 py-1 bg-gray-900/80 border border-gray-800 rounded-lg hover:border-yellow-400/40 transition-colors group"
                  >
                    {t.imageUri && (
                      <img src={t.imageUri} alt={t.name} className="w-5 h-5 rounded object-cover" />
                    )}
                    <span className="text-[11px] text-gray-300 group-hover:text-yellow-300 font-mono truncate max-w-[80px]">
                      {t.name}
                    </span>
                    {bump && bump.recentBumps > 0 && (
                      <span className="text-[9px] text-orange-400 font-bold">{bump.recentBumps}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TOKEN DASHBOARD */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex-1">
        <TokenDashboard tokenAddress={fudfather.token.address} />
      </div>
    </div>
  );
}
