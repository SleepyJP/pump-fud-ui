'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { useReadContracts } from 'wagmi';
import { ArrowLeft, Copy, Check } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TOKEN_ABI } from '@/config/abis';
import { formatPLS, formatTokens, formatAddress } from '@/lib/utils';

// CRITICAL: Dynamic import with SSR disabled for react-grid-layout
// WidthProvider/useContainerWidth crashes on SSR - must be client-only
const TokenDashboard = dynamic(
  () => import('@/components/dashboard/TokenDashboard').then((mod) => mod.TokenDashboard),
  {
    ssr: false,
    loading: () => (
      <div className="w-full min-h-[600px] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
          <span className="text-[#39ff14] font-mono text-sm animate-pulse">Loading Dashboard...</span>
        </div>
      </div>
    ),
  }
);

export default function TokenPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as `0x${string}`;

  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // V2: All token data comes directly from the token contract
  const { data: tokenData } = useReadContracts({
    contracts: [
      { address, abi: TOKEN_ABI, functionName: 'name' },
      { address, abi: TOKEN_ABI, functionName: 'symbol' },
      { address, abi: TOKEN_ABI, functionName: 'imageUri' },
      { address, abi: TOKEN_ABI, functionName: 'description' },
      { address, abi: TOKEN_ABI, functionName: 'creator' },
      { address, abi: TOKEN_ABI, functionName: 'plsReserve' },
      { address, abi: TOKEN_ABI, functionName: 'graduated' },
      { address, abi: TOKEN_ABI, functionName: 'deleted' },
      { address, abi: TOKEN_ABI, functionName: 'totalSupply' },
      { address, abi: TOKEN_ABI, functionName: 'getCurrentPrice' },
      { address, abi: TOKEN_ABI, functionName: 'getGraduationProgress' },
    ],
  });

  // Parse token data
  const name = tokenData?.[0]?.result as string;
  const symbol = tokenData?.[1]?.result as string;
  const imageUri = tokenData?.[2]?.result as string;
  const rawDescription = tokenData?.[3]?.result as string;
  const creator = tokenData?.[4]?.result as `0x${string}`;
  const plsReserve = tokenData?.[5]?.result as bigint;
  const graduated = tokenData?.[6]?.result as boolean;
  const deleted = tokenData?.[7]?.result as boolean;
  const totalSupply = tokenData?.[8]?.result as bigint;
  const currentPrice = tokenData?.[9]?.result as bigint;
  const graduationProgress = tokenData?.[10]?.result as bigint;

  // Parse description JSON (stored as {"description":"...", "socials":{...}})
  const parsedDescription = useMemo(() => {
    if (!rawDescription || rawDescription === '') {
      return { description: '', socials: {} as Record<string, string> };
    }
    try {
      const parsed = JSON.parse(rawDescription);
      return {
        description: typeof parsed === 'object' && parsed.description ? parsed.description : rawDescription,
        socials: (typeof parsed === 'object' && parsed.socials ? parsed.socials : {}) as Record<string, string>,
      };
    } catch {
      return { description: rawDescription, socials: {} as Record<string, string> };
    }
  }, [rawDescription]);

  // Graduation threshold is 50 MILLION PLS
  const GRADUATION_THRESHOLD = BigInt(50_000_000) * BigInt(10) ** BigInt(18);
  const graduationProgressPercent = plsReserve && plsReserve > BigInt(0)
    ? Number((plsReserve * BigInt(100)) / GRADUATION_THRESHOLD)
    : 0;

  // SSR guard - show loading during server render
  if (!mounted) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 py-8 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-fud-green/20 border-t-fud-green rounded-full animate-spin" />
            <span className="text-fud-green font-mono text-sm">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  if (deleted) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <div className="text-center py-20">
            <h1 className="font-display text-4xl text-fud-red mb-4">Token Deleted</h1>
            <p className="text-text-muted font-mono">This token has been removed from the platform.</p>
            <Link href="/tokens" className="mt-8 inline-block px-6 py-3 bg-fud-green text-black font-mono rounded-lg">
              Browse Tokens
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <div className="max-w-[1400px] mx-auto px-4 py-8">
        {/* Back Button */}
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-secondary border border-border-primary text-text-muted hover:text-fud-green hover:border-fud-green/50 transition-colors font-mono text-sm"
          >
            <ArrowLeft size={16} />
            Back
          </button>
          <Link
            href="/tokens"
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-dark-secondary border border-border-primary text-text-muted hover:text-fud-green hover:border-fud-green/50 transition-colors font-mono text-sm"
          >
            All Tokens
          </Link>
        </div>

        {/* Token Header */}
        <div className="flex items-start justify-between gap-6 mb-8">
          <div className="flex-1">
            <div className="mb-3">
              <div className="flex items-center gap-3 mb-1">
                <h1 className="font-display text-5xl">
                  {name && name.includes('.') ? (
                    <>
                      <span className="text-fud-green" style={{ textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88' }}>
                        {name.split('.')[0]}
                      </span>
                      <span className="text-white" style={{ textShadow: '0 0 10px #ffffff, 0 0 20px #ffffff' }}>
                        .{name.split('.').slice(1).join('.')}
                      </span>
                    </>
                  ) : (
                    <span className="text-fud-green" style={{ textShadow: '0 0 10px #00ff88, 0 0 20px #00ff88' }}>
                      {name || 'Token'}
                    </span>
                  )}
                </h1>
                {graduated && (
                  <span className="px-3 py-1 bg-fud-green/20 text-fud-green text-xs font-mono rounded-full">
                    ✓ GRADUATED
                  </span>
                )}
              </div>
              <p className="text-2xl font-mono text-white">${symbol || 'SYMBOL'}</p>
            </div>
            <p className="text-text-secondary text-sm mb-3 max-w-xl leading-relaxed">
              {parsedDescription.description || 'No description'}
            </p>
            {/* Social Links */}
            {(parsedDescription.socials?.twitter || parsedDescription.socials?.telegram || parsedDescription.socials?.website) && (
              <div className="flex items-center gap-4 mb-3">
                {parsedDescription.socials.twitter && (
                  <a href={parsedDescription.socials.twitter} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-dark-secondary border border-border-primary rounded-lg text-text-muted hover:text-fud-green hover:border-fud-green/50 transition-colors text-xs font-mono">
                    𝕏 Twitter
                  </a>
                )}
                {parsedDescription.socials.telegram && (
                  <a href={parsedDescription.socials.telegram} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-dark-secondary border border-border-primary rounded-lg text-text-muted hover:text-fud-green hover:border-fud-green/50 transition-colors text-xs font-mono">
                    📱 Telegram
                  </a>
                )}
                {parsedDescription.socials.website && (
                  <a href={parsedDescription.socials.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-3 py-1.5 bg-dark-secondary border border-border-primary rounded-lg text-text-muted hover:text-fud-green hover:border-fud-green/50 transition-colors text-xs font-mono">
                    🌐 Website
                  </a>
                )}
              </div>
            )}
            <div className="flex items-center gap-4 text-xs font-mono">
              <span className="text-text-muted">
                Creator:{' '}
                <a
                  href={`https://scan.pulsechain.com/address/${creator}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fud-green hover:underline"
                >
                  {creator ? formatAddress(creator as string) : '...'}
                </a>
              </span>
              <button
                onClick={() => copyToClipboard(address)}
                className="flex items-center gap-1 text-text-muted hover:text-fud-green transition-colors"
              >
                Contract:{' '}
                <span className="text-fud-green">{formatAddress(address)}</span>
                {copied ? (
                  <Check size={12} className="text-fud-green" />
                ) : (
                  <Copy size={12} className="opacity-50 hover:opacity-100" />
                )}
              </button>
            </div>
          </div>

          {/* Token Image */}
          <div className="w-64 h-64 flex-shrink-0 rounded-2xl bg-dark-secondary flex items-center justify-center overflow-hidden border-3 border-fud-green shadow-2xl shadow-fud-green/30">
            {imageUri ? (
              <img
                src={imageUri as string}
                alt={symbol as string}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-8xl">🚀</span>
            )}
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
          <Card className="p-4">
            <div className="text-text-muted text-xs font-mono mb-1">Price</div>
            <div className="text-fud-green font-display text-lg">
              {currentPrice ? formatPLS(currentPrice as bigint, 8) : '--'} PLS
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-text-muted text-xs font-mono mb-1">Reserve</div>
            <div className="text-text-primary font-display text-lg">
              {plsReserve ? formatPLS(plsReserve as bigint) : '--'} PLS
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-text-muted text-xs font-mono mb-1">Supply</div>
            <div className="text-text-primary font-display text-lg">
              {totalSupply ? formatTokens(totalSupply as bigint) : '--'}
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-fud-green text-xs font-mono mb-1">BUYS</div>
            <div className="text-fud-green font-display text-lg">
              --
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-fud-orange text-xs font-mono mb-1">SELLS</div>
            <div className="text-fud-orange font-display text-lg">
              --
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-text-muted text-xs font-mono mb-1">Status</div>
            <div
              className={`font-display text-lg ${graduated ? 'text-fud-green' : 'text-fud-orange'}`}
            >
              {graduated ? 'GRADUATED' : 'BONDING'}
            </div>
          </Card>
        </div>

        {/* Progress Bar */}
        {!graduated && (
          <Card className="p-4 mb-4">
            <div className="flex justify-between text-xs font-mono mb-2">
              <span className="text-text-muted">Bonding Progress</span>
              <span className="text-fud-green">
                {plsReserve ? formatPLS(plsReserve as bigint) : '0'} / 50M PLS to BOND
              </span>
            </div>
            <div className="h-3 bg-dark-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                style={{
                  width: `${Math.min(graduationProgressPercent, 100)}%`,
                }}
              />
            </div>
          </Card>
        )}

        {/* Dashboard Grid - THE FORGE v4.0 - Using dynamic import with ssr: false */}
        <TokenDashboard
          tokenAddress={address}
          tokenName={name}
          tokenSymbol={symbol}
          imageUri={imageUri}
          description={parsedDescription.description}
          creator={creator}
          socials={parsedDescription.socials as { twitter?: string; telegram?: string; website?: string }}
          currentPrice={currentPrice}
          totalSupply={totalSupply}
          plsReserve={plsReserve}
          graduated={graduated}
        />
      </div>
    </div>
  );
}
