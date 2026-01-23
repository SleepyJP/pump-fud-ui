'use client';

import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useBalance } from 'wagmi';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  User,
  Wallet,
  Coins,
  TrendingUp,
  Trophy,
  Activity,
  ExternalLink,
  Copy,
  Check,
  Rocket,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';

interface TokenHolding {
  address: `0x${string}`;
  name: string;
  symbol: string;
  balance: bigint;
  value?: bigint;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'holdings' | 'created' | 'activity'>('holdings');
  const [holdings, setHoldings] = useState<TokenHolding[]>([]);
  const [createdTokens, setCreatedTokens] = useState<`0x${string}`[]>([]);
  const [isLoadingHoldings, setIsLoadingHoldings] = useState(false);

  // Get PLS balance
  const { data: plsBalance } = useBalance({
    address: address,
  });

  // Get all tokens from factory
  const { data: allTokens } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'getTokens',
    args: [BigInt(0), BigInt(100)],
    query: { enabled: !!CONTRACTS.FACTORY && isConnected },
  });

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Check holdings across all tokens
  useEffect(() => {
    const checkHoldings = async () => {
      if (!allTokens || !address || allTokens.length === 0) return;

      setIsLoadingHoldings(true);
      const foundHoldings: TokenHolding[] = [];

      // This is simplified - in production you'd use multicall for efficiency
      for (const tokenAddr of allTokens) {
        try {
          // We'll just store the token info for now
          // Balance fetching would need individual calls or multicall
          foundHoldings.push({
            address: tokenAddr,
            name: 'Loading...',
            symbol: '...',
            balance: BigInt(0),
          });
        } catch {
          // Skip failed tokens
        }
      }

      setHoldings(foundHoldings);
      setIsLoadingHoldings(false);
    };

    checkHoldings();
  }, [allTokens, address]);

  if (!isConnected) {
    return (
      <div className="min-h-screen grid-bg flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <Wallet className="w-16 h-16 mx-auto mb-4 text-fud-green" />
          <h1 className="font-display text-2xl text-fud-green mb-2">Connect Wallet</h1>
          <p className="text-text-muted font-mono text-sm mb-4">
            Connect your wallet to view your profile
          </p>
          <Button onClick={() => router.push('/')} variant="secondary">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen grid-bg">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Profile Header */}
        <Card variant="glow" className="mb-8">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
              {/* Avatar */}
              <div className="w-24 h-24 bg-gradient-to-br from-fud-green via-fud-purple to-fud-orange rounded-2xl flex items-center justify-center">
                <User size={48} className="text-dark-bg" />
              </div>

              {/* Info */}
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="font-display text-2xl text-fud-green">
                    {formatAddress(address!)}
                  </h1>
                  <button
                    onClick={copyAddress}
                    className="p-1.5 hover:bg-dark-secondary rounded transition-colors"
                    title="Copy address"
                  >
                    {copied ? (
                      <Check size={16} className="text-fud-green" />
                    ) : (
                      <Copy size={16} className="text-text-muted" />
                    )}
                  </button>
                  <a
                    href={`https://scan.pulsechain.com/address/${address}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 hover:bg-dark-secondary rounded transition-colors"
                    title="View on PulseScan"
                  >
                    <ExternalLink size={16} className="text-text-muted" />
                  </a>
                </div>
                <p className="text-text-muted font-mono text-sm">
                  Connected to PulseChain
                </p>
              </div>

              {/* Balance */}
              <div className="text-right">
                <p className="text-text-muted text-xs font-mono mb-1">PLS Balance</p>
                <p className="font-display text-3xl text-fud-green">
                  {plsBalance ? formatPLS(plsBalance.value) : '0'} PLS
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card variant="bordered" className="p-4 text-center">
            <Coins className="w-8 h-8 mx-auto mb-2 text-fud-green" />
            <div className="text-2xl font-display text-fud-green">{holdings.length}</div>
            <div className="text-xs font-mono text-text-muted">Tokens Held</div>
          </Card>
          <Card variant="bordered" className="p-4 text-center">
            <Rocket className="w-8 h-8 mx-auto mb-2 text-fud-purple" />
            <div className="text-2xl font-display text-fud-purple">{createdTokens.length}</div>
            <div className="text-xs font-mono text-text-muted">Tokens Created</div>
          </Card>
          <Card variant="bordered" className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-fud-orange" />
            <div className="text-2xl font-display text-fud-orange">--</div>
            <div className="text-xs font-mono text-text-muted">Total P&L</div>
          </Card>
          <Card variant="bordered" className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <div className="text-2xl font-display text-yellow-400">--</div>
            <div className="text-xs font-mono text-text-muted">Leaderboard Rank</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-primary pb-2">
          <button
            onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors ${
              activeTab === 'holdings'
                ? 'bg-fud-green/20 text-fud-green border-b-2 border-fud-green'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Coins size={16} />
            Holdings
          </button>
          <button
            onClick={() => setActiveTab('created')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors ${
              activeTab === 'created'
                ? 'bg-fud-purple/20 text-fud-purple border-b-2 border-fud-purple'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Rocket size={16} />
            Created
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors ${
              activeTab === 'activity'
                ? 'bg-fud-orange/20 text-fud-orange border-b-2 border-fud-orange'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Activity size={16} />
            Activity
          </button>
        </div>

        {/* Tab Content */}
        <Card variant="bordered">
          <CardContent className="p-6">
            {activeTab === 'holdings' && (
              <div>
                {isLoadingHoldings ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-text-muted font-mono text-sm">Loading holdings...</p>
                  </div>
                ) : holdings.length === 0 ? (
                  <div className="text-center py-12">
                    <Coins className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                    <p className="text-text-muted font-mono text-sm mb-4">
                      No token holdings found
                    </p>
                    <Link href="/tokens">
                      <Button variant="secondary" className="gap-2">
                        Browse Tokens
                        <ArrowUpRight size={16} />
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {holdings.slice(0, 10).map((token) => (
                      <Link
                        key={token.address}
                        href={`/token/${token.address}`}
                        className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg hover:bg-dark-tertiary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-fud-green/20 rounded-lg flex items-center justify-center">
                            <span className="text-fud-green font-mono text-sm">
                              {token.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <p className="text-text-primary font-mono">{token.name}</p>
                            <p className="text-text-muted text-xs font-mono">{token.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-fud-green font-mono">--</p>
                          <p className="text-text-muted text-xs font-mono">Balance</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'created' && (
              <div className="text-center py-12">
                <Rocket className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                <p className="text-text-muted font-mono text-sm mb-4">
                  No tokens created yet
                </p>
                <Link href="/">
                  <Button className="gap-2">
                    <Rocket size={16} />
                    Launch a Token
                  </Button>
                </Link>
              </div>
            )}

            {activeTab === 'activity' && (
              <div className="text-center py-12">
                <Activity className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                <p className="text-text-muted font-mono text-sm">
                  Recent activity will appear here
                </p>
                <p className="text-text-muted/50 text-xs font-mono mt-2">
                  Track your buys, sells, and token launches
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
