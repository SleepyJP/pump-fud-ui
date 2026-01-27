'use client';

import dynamic from 'next/dynamic';
import { Suspense, useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { ArrowLeft } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { TOKEN_ABI } from '@/config/abis';
import { formatPLS, formatTokens, formatAddress } from '@/lib/utils';

// Dynamic import with SSR disabled - react-grid-layout is browser-only
const DashboardGrid = dynamic(
  () => import('@/components/dashboard/DashboardGrid').then((mod) => ({ default: mod.DashboardGrid })),
  {
    ssr: false,
    loading: () => <DashboardLoader />,
  }
);

// Loading component for dashboard
function DashboardLoader() {
  return (
    <div className="min-h-[600px] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="w-12 h-12 border-4 border-fud-green/20 border-t-fud-green rounded-full animate-spin" />
        <span className="text-fud-green font-mono text-sm animate-pulse">Loading Dashboard...</span>
      </div>
    </div>
  );
}

export default function TokenPage() {
  const params = useParams();
  const router = useRouter();
  const address = params.address as `0x${string}`;

  // Client-only mount guard to prevent hydration mismatch
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    setMounted(true);
  }, []);

  const { data: name } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'name',
  });

  const { data: symbol } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'symbol',
  });

  const { data: totalSupply } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
  });

  const { data: plsReserve } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'plsReserve',
  });

  const { data: graduated } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'graduated',
  });

  const { data: currentPrice } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'getCurrentPrice',
  });

  const { data: graduationProgress } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'getGraduationProgress',
  });

  const { data: creator } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'creator',
  });

  const { data: imageUri } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'imageUri',
  });

  const { data: description } = useReadContract({
    address,
    abi: TOKEN_ABI,
    functionName: 'description',
  });

  // Show loader during SSR or before client mount
  if (!mounted) {
    return (
      <div className="min-h-screen">
        <div className="max-w-[1400px] mx-auto px-4 py-8">
          <DashboardLoader />
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
        <div className="flex items-start gap-6 mb-8">
          <div className="w-20 h-20 rounded-xl bg-dark-secondary flex items-center justify-center overflow-hidden border border-fud-green/30">
            {imageUri ? (
              <img
                src={imageUri as string}
                alt={name as string}
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-4xl">🚀</span>
            )}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-3 mb-2">
              <h1 className="font-display text-3xl text-fud-green">{name || 'Loading...'}</h1>
              <span className="text-text-muted font-mono">${symbol || '...'}</span>
              {graduated && (
                <span className="px-3 py-1 bg-fud-green/20 text-fud-green text-xs font-mono rounded-full">
                  ✓ GRADUATED
                </span>
              )}
            </div>
            <p className="text-text-secondary text-sm mb-2 max-w-2xl">
              {description || 'No description'}
            </p>
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
              <span className="text-text-muted">
                Contract:{' '}
                <a
                  href={`https://scan.pulsechain.com/address/${address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-fud-green hover:underline"
                >
                  {formatAddress(address)}
                </a>
              </span>
            </div>
          </div>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-4">
          <Card className="p-4">
            <div className="text-text-muted text-xs font-mono mb-1">Price</div>
            <div className="text-fud-green font-display text-lg">
              {currentPrice ? formatPLS(currentPrice as bigint, 8) : '--'} PLS
            </div>
          </Card>
          <Card className="p-4">
            <div className="text-text-muted text-xs font-mono mb-1">Market Cap</div>
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
            <div className="text-text-muted text-xs font-mono mb-1">Graduation</div>
            <div className="text-fud-green font-display text-lg">
              {graduationProgress !== undefined ? `${Number(graduationProgress)}%` : '--'}
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
              <span className="text-text-muted">Graduation Progress</span>
              <span className="text-fud-green">
                {plsReserve ? formatPLS(plsReserve as bigint) : '0'} / 50M PLS
              </span>
            </div>
            <div className="h-3 bg-dark-secondary rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-fud-green to-fud-green-bright transition-all duration-500"
                style={{
                  width: `${Math.min(Number(graduationProgress || 0), 100)}%`,
                }}
              />
            </div>
          </Card>
        )}

        {/* Draggable Dashboard Grid - Wrapped in Suspense */}
        <Suspense fallback={<DashboardLoader />}>
          <DashboardGrid
            tokenAddress={address}
            tokenSymbol={symbol as string}
            currentPrice={currentPrice as bigint}
            totalSupply={totalSupply as bigint}
            creator={creator as `0x${string}`}
          />
        </Suspense>
      </div>
    </div>
  );
}
