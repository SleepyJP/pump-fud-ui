'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useReadContract } from 'wagmi';
import { Crown, Trophy, TrendingUp, Users, Coins, ExternalLink } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FACTORY_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';

interface LeaderboardEntry {
  address: `0x${string}`;
  name: string;
  symbol: string;
  reserve: bigint;
  graduated: boolean;
}

export default function LeaderboardPage() {
  const [tokens, setTokens] = useState<LeaderboardEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch all tokens from factory
  const { data: allTokensData } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getAllTokens',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!CONTRACTS.FACTORY },
  });

  useEffect(() => {
    if (!allTokensData) {
      setIsLoading(false);
      return;
    }

    const entries: LeaderboardEntry[] = allTokensData
      .filter((t) => t.status === 0 || t.status === 1) // Live or Graduated
      .map((t) => ({
        address: t.tokenAddress as `0x${string}`,
        name: t.name || 'Unknown',
        symbol: t.symbol || '???',
        reserve: t.reserveBalance || BigInt(0),
        graduated: t.status === 1,
      }))
      .sort((a, b) => Number(b.reserve - a.reserve)); // Sort by reserve descending

    setTokens(entries);
    setIsLoading(false);
  }, [allTokensData]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400" size={24} />;
      case 2:
        return <Trophy className="text-gray-300" size={22} />;
      case 3:
        return <Trophy className="text-orange-400" size={20} />;
      default:
        return <span className="text-text-muted font-mono text-lg w-6 text-center">{rank}</span>;
    }
  };

  const getRankBg = (rank: number) => {
    switch (rank) {
      case 1:
        return 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/10 border-yellow-500/30';
      case 2:
        return 'bg-gradient-to-r from-gray-400/20 to-gray-500/10 border-gray-400/30';
      case 3:
        return 'bg-gradient-to-r from-orange-500/20 to-orange-600/10 border-orange-500/30';
      default:
        return 'bg-dark-secondary border-border-primary hover:border-fud-green/30';
    }
  };

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h1 className="font-display text-3xl text-fud-green mb-2">Leaderboard</h1>
          <p className="text-text-muted font-mono text-sm">
            Top tokens ranked by PLS reserve
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <Card className="text-center">
            <CardContent className="p-4">
              <Coins className="w-8 h-8 mx-auto mb-2 text-fud-green" />
              <p className="text-2xl font-display text-text-primary">{tokens.length}</p>
              <p className="text-xs text-text-muted font-mono">Total Tokens</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <Trophy className="w-8 h-8 mx-auto mb-2 text-fud-orange" />
              <p className="text-2xl font-display text-text-primary">
                {tokens.filter((t) => t.graduated).length}
              </p>
              <p className="text-xs text-text-muted font-mono">Graduated</p>
            </CardContent>
          </Card>
          <Card className="text-center">
            <CardContent className="p-4">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-fud-purple" />
              <p className="text-2xl font-display text-text-primary">
                {formatPLS(tokens.reduce((acc, t) => acc + t.reserve, BigInt(0)))}
              </p>
              <p className="text-xs text-text-muted font-mono">Total Reserve</p>
            </CardContent>
          </Card>
        </div>

        {/* Leaderboard List */}
        {isLoading ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-4" />
            <p className="text-text-muted font-mono">Loading leaderboard...</p>
          </div>
        ) : tokens.length === 0 ? (
          <div className="text-center py-12">
            <Crown className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50" />
            <p className="text-text-muted font-mono mb-4">No tokens yet</p>
            <Link href="/launch">
              <Button>Be the First to Launch</Button>
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {tokens.map((token, index) => {
              const rank = index + 1;
              return (
                <Link key={token.address} href={`/token/${token.address}`}>
                  <Card
                    className={`border transition-all cursor-pointer ${getRankBg(rank)}`}
                  >
                    <CardContent className="p-4 flex items-center gap-4">
                      {/* Rank */}
                      <div className="w-10 flex items-center justify-center">
                        {getRankIcon(rank)}
                      </div>

                      {/* Token Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-display text-lg text-text-primary">
                            {token.name}
                          </h3>
                          <span className="text-text-muted font-mono text-sm">
                            ${token.symbol}
                          </span>
                          {token.graduated && (
                            <span className="px-2 py-0.5 bg-fud-orange/20 text-fud-orange text-xs font-mono rounded">
                              GRADUATED
                            </span>
                          )}
                        </div>
                        <p className="text-text-muted font-mono text-xs">
                          {formatAddress(token.address)}
                        </p>
                      </div>

                      {/* Reserve */}
                      <div className="text-right">
                        <p className="font-display text-xl text-fud-green">
                          {formatPLS(token.reserve)} PLS
                        </p>
                        <p className="text-text-muted font-mono text-xs">Reserve</p>
                      </div>

                      {/* Link Icon */}
                      <ExternalLink size={16} className="text-text-muted" />
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
