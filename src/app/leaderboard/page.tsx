'use client';

import { useEffect, useState, useMemo } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import Link from 'next/link';
import {
  Crown,
  Trophy,
  TrendingUp,
  Users,
  Coins,
  ExternalLink,
  Copy,
  Check,
  Zap,
  Gift,
  Link2,
  Percent,
  ChevronRight,
  Rocket,
  ArrowUpRight,
  ArrowDownRight,
  Share2,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FACTORY_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';

type LeaderboardTab = 'airdrop' | 'referral' | 'roi';

interface AirdropEntry {
  address: `0x${string}`;
  totalFeesPaid: bigint;
  projectedAirdrop: bigint;
  rank: number;
  swapCount: number;
}

interface ReferralEntry {
  address: `0x${string}`;
  referralCode: string;
  referralCount: number;
  totalEarnings: bigint;
  pendingEarnings: bigint;
  rank: number;
}

interface ROIEntry {
  address: `0x${string}`;
  totalInvested: bigint;
  currentValue: bigint;
  realizedPnL: bigint;
  unrealizedPnL: bigint;
  roiPercent: number;
  rank: number;
  tokenCount: number;
}

export default function LeaderboardPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('airdrop');
  const [copied, setCopied] = useState(false);
  const [referralLink, setReferralLink] = useState('');

  // Mock data - would come from contract/indexer in production
  const [airdropLeaderboard, setAirdropLeaderboard] = useState<AirdropEntry[]>([]);
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralEntry[]>([]);
  const [roiLeaderboard, setROILeaderboard] = useState<ROIEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Platform stats
  const [platformStats, setPlatformStats] = useState({
    totalFees24h: BigInt(0),
    totalAirdropPool: BigInt(0),
    nextAirdropTime: Date.now() + 12 * 60 * 60 * 1000, // 12 hours from now
    totalReferralEarnings: BigInt(0),
    totalUsers: 0,
  });

  // Generate referral link for connected user
  useEffect(() => {
    if (address) {
      // Referral code is first 8 chars of address + random suffix
      const code = address.slice(2, 10).toUpperCase();
      setReferralLink(`https://pump-fud-ui.vercel.app/?ref=${code}`);
    }
  }, [address]);

  // Load leaderboard data
  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);

      // In production, this would fetch from:
      // 1. Contract events (FeesPaid, ReferralEarnings)
      // 2. Indexer/subgraph for aggregated data
      // 3. Backend API for computed rankings

      // Mock data for demonstration
      const mockAirdrop: AirdropEntry[] = [
        // Empty for now - will populate when users start trading
      ];

      const mockReferral: ReferralEntry[] = [
        // Empty for now
      ];

      const mockROI: ROIEntry[] = [
        // Empty for now
      ];

      setAirdropLeaderboard(mockAirdrop);
      setReferralLeaderboard(mockReferral);
      setROILeaderboard(mockROI);

      setPlatformStats({
        totalFees24h: BigInt(0),
        totalAirdropPool: BigInt(0),
        nextAirdropTime: Date.now() + 12 * 60 * 60 * 1000,
        totalReferralEarnings: BigInt(0),
        totalUsers: 0,
      });

      setIsLoading(false);
    };

    loadData();
  }, []);

  // Copy referral link
  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format time until next airdrop
  const formatTimeUntil = (timestamp: number) => {
    const diff = timestamp - Date.now();
    if (diff <= 0) return 'Processing...';
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  };

  // User's own stats
  const userAirdropStats = useMemo(() => {
    if (!address) return null;
    return airdropLeaderboard.find(
      (e) => e.address.toLowerCase() === address.toLowerCase()
    );
  }, [airdropLeaderboard, address]);

  const userReferralStats = useMemo(() => {
    if (!address) return null;
    return referralLeaderboard.find(
      (e) => e.address.toLowerCase() === address.toLowerCase()
    );
  }, [referralLeaderboard, address]);

  const userROIStats = useMemo(() => {
    if (!address) return null;
    return roiLeaderboard.find(
      (e) => e.address.toLowerCase() === address.toLowerCase()
    );
  }, [roiLeaderboard, address]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="text-yellow-400" size={20} />;
      case 2:
        return <Trophy className="text-gray-300" size={18} />;
      case 3:
        return <Trophy className="text-orange-400" size={18} />;
      default:
        return <span className="text-text-muted font-mono text-sm w-5 text-center">{rank}</span>;
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
    <div className="min-h-screen relative">
      {/* Full-bleed background */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundImage: 'url(/backgrounds/leaderboard-bg.jpg)',
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
          background: 'linear-gradient(180deg, rgba(0,0,0,0.6) 0%, rgba(0,0,0,0.4) 50%, rgba(0,0,0,0.6) 100%)',
          zIndex: 1,
        }}
      />
      <div className="relative z-10 max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-8">
          <Crown className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
          <h1 className="font-display text-4xl text-fud-green mb-2">Leaderboards</h1>
          <p className="text-text-muted font-mono text-sm">
            Earn airdrops, referral rewards & track your ROI
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="flex justify-center gap-2 mb-8">
          <button
            onClick={() => setActiveTab('airdrop')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm transition-all ${
              activeTab === 'airdrop'
                ? 'bg-fud-green/20 text-fud-green border-2 border-fud-green'
                : 'bg-dark-secondary/80 border border-border-primary text-text-muted hover:border-fud-green/30'
            }`}
          >
            <Gift size={18} />
            Airdrop Rankings
          </button>
          <button
            onClick={() => setActiveTab('referral')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm transition-all ${
              activeTab === 'referral'
                ? 'bg-fud-purple/20 text-fud-purple border-2 border-fud-purple'
                : 'bg-dark-secondary/80 border border-border-primary text-text-muted hover:border-fud-purple/30'
            }`}
          >
            <Link2 size={18} />
            Referral Rankings
          </button>
          <button
            onClick={() => setActiveTab('roi')}
            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-mono text-sm transition-all ${
              activeTab === 'roi'
                ? 'bg-fud-orange/20 text-fud-orange border-2 border-fud-orange'
                : 'bg-dark-secondary/80 border border-border-primary text-text-muted hover:border-fud-orange/30'
            }`}
          >
            <Percent size={18} />
            ROI Rankings
          </button>
        </div>

        {/* AIRDROP TAB */}
        {activeTab === 'airdrop' && (
          <div className="space-y-6">
            {/* Airdrop Info Card */}
            <Card className="bg-gradient-to-r from-fud-green/10 to-fud-green/5 border-fud-green/30">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h3 className="font-display text-xl text-fud-green mb-2">
                      🎁 Daily Airdrop Pool
                    </h3>
                    <p className="text-text-muted text-sm font-mono max-w-md">
                      50% of all platform fees are distributed daily to users based on their trading activity.
                      The more you swap, the bigger your share!
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-text-muted text-xs font-mono mb-1">Next Airdrop In</p>
                    <p className="font-display text-3xl text-fud-green">
                      {formatTimeUntil(platformStats.nextAirdropTime)}
                    </p>
                    <p className="text-text-muted text-xs font-mono mt-1">
                      Pool: {formatPLS(platformStats.totalAirdropPool)} PLS
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Fee Structure Info */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Card className="p-4 text-center bg-dark-secondary/80">
                <Zap className="w-8 h-8 mx-auto mb-2 text-fud-green" />
                <p className="text-2xl font-display text-fud-green">1.0%</p>
                <p className="text-xs text-text-muted font-mono">Buy Fee</p>
              </Card>
              <Card className="p-4 text-center bg-dark-secondary/80">
                <TrendingUp className="w-8 h-8 mx-auto mb-2 text-fud-orange" />
                <p className="text-2xl font-display text-fud-orange">1.1%</p>
                <p className="text-xs text-text-muted font-mono">Sell Fee</p>
              </Card>
              <Card className="p-4 text-center bg-dark-secondary/80">
                <Gift className="w-8 h-8 mx-auto mb-2 text-fud-purple" />
                <p className="text-2xl font-display text-fud-purple">50%</p>
                <p className="text-xs text-text-muted font-mono">To Users</p>
              </Card>
              <Card className="p-4 text-center bg-dark-secondary/80">
                <Coins className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
                <p className="text-2xl font-display text-yellow-400">
                  {formatPLS(platformStats.totalFees24h)}
                </p>
                <p className="text-xs text-text-muted font-mono">24h Fees</p>
              </Card>
            </div>

            {/* Your Stats (if connected) */}
            {isConnected && (
              <Card className="border-fud-green/30 bg-dark-secondary/80">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-fud-green/20 rounded-xl flex items-center justify-center">
                      <Gift className="text-fud-green" size={24} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-fud-green">Your Airdrop Stats</h3>
                      <p className="text-text-muted text-xs font-mono">{formatAddress(address!)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-fud-green">
                        #{userAirdropStats?.rank || '--'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Your Rank</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-text-primary">
                        {userAirdropStats ? formatPLS(userAirdropStats.totalFeesPaid) : '0'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Fees Paid</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-fud-green">
                        {userAirdropStats ? formatPLS(userAirdropStats.projectedAirdrop) : '0'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Est. Airdrop</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-text-primary">
                        {userAirdropStats?.swapCount || 0}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Swaps</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Leaderboard List */}
            <Card className="bg-dark-secondary/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Crown className="text-yellow-400" size={20} />
                  Top Traders - Airdrop Rankings
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-text-muted font-mono text-sm">Loading...</p>
                  </div>
                ) : airdropLeaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <Gift className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50" />
                    <p className="text-text-muted font-mono mb-2">No trading activity yet</p>
                    <p className="text-text-muted/50 text-xs font-mono mb-4">
                      Start trading to earn airdrop rewards!
                    </p>
                    <Link href="/tokens">
                      <Button className="gap-2">
                        <Rocket size={16} />
                        Browse Tokens
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {airdropLeaderboard.slice(0, 25).map((entry) => (
                      <div
                        key={entry.address}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getRankBg(entry.rank)}`}
                      >
                        <div className="w-8 flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-sm text-text-primary">
                            {formatAddress(entry.address)}
                          </p>
                          <p className="text-xs text-text-muted font-mono">
                            {entry.swapCount} swaps
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg text-fud-green">
                            {formatPLS(entry.projectedAirdrop)} PLS
                          </p>
                          <p className="text-xs text-text-muted font-mono">Est. Airdrop</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* REFERRAL TAB */}
        {activeTab === 'referral' && (
          <div className="space-y-6">
            {/* Referral Info Card */}
            <Card className="bg-gradient-to-r from-fud-purple/10 to-fud-purple/5 border-fud-purple/30">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h3 className="font-display text-xl text-fud-purple mb-2">
                      🔗 Referral Program
                    </h3>
                    <p className="text-text-muted text-sm font-mono max-w-md">
                      Share your referral link and earn a percentage of fees from everyone you refer.
                      Earnings split between you and the platform.
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-text-muted text-xs font-mono mb-1">Total Referral Payouts</p>
                    <p className="font-display text-3xl text-fud-purple">
                      {formatPLS(platformStats.totalReferralEarnings)} PLS
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Generate Referral Link */}
            {isConnected ? (
              <Card className="border-fud-purple/30 bg-dark-secondary/80">
                <CardContent className="p-6">
                  <h3 className="font-display text-lg text-fud-purple mb-4 flex items-center gap-2">
                    <Share2 size={20} />
                    Your Referral Link
                  </h3>
                  <div className="flex gap-2">
                    <Input
                      value={referralLink}
                      readOnly
                      className="flex-1 bg-dark-tertiary font-mono text-sm"
                    />
                    <Button onClick={copyReferralLink} variant="secondary" className="gap-2">
                      {copied ? <Check size={16} /> : <Copy size={16} />}
                      {copied ? 'Copied!' : 'Copy'}
                    </Button>
                  </div>
                  <p className="text-text-muted text-xs font-mono mt-2">
                    Share this link. When people trade using your link, you earn rewards!
                  </p>

                  {/* Your Referral Stats */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-fud-purple">
                        #{userReferralStats?.rank || '--'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Your Rank</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-text-primary">
                        {userReferralStats?.referralCount || 0}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Referrals</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-fud-green">
                        {userReferralStats ? formatPLS(userReferralStats.totalEarnings) : '0'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Total Earned</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-fud-orange">
                        {userReferralStats ? formatPLS(userReferralStats.pendingEarnings) : '0'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="border-fud-purple/30 bg-dark-secondary/80">
                <CardContent className="p-8 text-center">
                  <Link2 className="w-12 h-12 mx-auto mb-4 text-fud-purple" />
                  <p className="text-text-muted font-mono mb-4">
                    Connect your wallet to generate a referral link
                  </p>
                </CardContent>
              </Card>
            )}

            {/* Referral Leaderboard */}
            <Card className="bg-dark-secondary/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="text-fud-purple" size={20} />
                  Top Referrers
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-fud-purple/30 border-t-fud-purple rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-text-muted font-mono text-sm">Loading...</p>
                  </div>
                ) : referralLeaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <Users className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50" />
                    <p className="text-text-muted font-mono mb-2">No referrals yet</p>
                    <p className="text-text-muted/50 text-xs font-mono">
                      Be the first to share your referral link!
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {referralLeaderboard.slice(0, 25).map((entry) => (
                      <div
                        key={entry.address}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getRankBg(entry.rank)}`}
                      >
                        <div className="w-8 flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-sm text-text-primary">
                            {formatAddress(entry.address)}
                          </p>
                          <p className="text-xs text-text-muted font-mono">
                            {entry.referralCount} referrals
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-display text-lg text-fud-purple">
                            {formatPLS(entry.totalEarnings)} PLS
                          </p>
                          <p className="text-xs text-text-muted font-mono">Total Earned</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* ROI TAB */}
        {activeTab === 'roi' && (
          <div className="space-y-6">
            {/* ROI Info Card */}
            <Card className="bg-gradient-to-r from-fud-orange/10 to-fud-orange/5 border-fud-orange/30">
              <CardContent className="p-6">
                <div className="flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="text-center md:text-left">
                    <h3 className="font-display text-xl text-fud-orange mb-2">
                      📈 ROI Leaderboard
                    </h3>
                    <p className="text-text-muted text-sm font-mono max-w-md">
                      Track the best performing traders on the platform.
                      ROI calculated from all token investments and exits.
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-text-muted text-xs font-mono mb-1">Top Performer ROI</p>
                    <p className="font-display text-3xl text-fud-green">
                      {roiLeaderboard.length > 0 ? `+${roiLeaderboard[0].roiPercent.toFixed(1)}%` : '--'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Your ROI Stats */}
            {isConnected && (
              <Card className="border-fud-orange/30 bg-dark-secondary/80">
                <CardContent className="p-6">
                  <div className="flex items-center gap-4 mb-4">
                    <div className="w-12 h-12 bg-fud-orange/20 rounded-xl flex items-center justify-center">
                      <Percent className="text-fud-orange" size={24} />
                    </div>
                    <div>
                      <h3 className="font-display text-lg text-fud-orange">Your Trading Performance</h3>
                      <p className="text-text-muted text-xs font-mono">{formatAddress(address!)}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-fud-orange">
                        #{userROIStats?.rank || '--'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Rank</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-text-primary">
                        {userROIStats ? formatPLS(userROIStats.totalInvested) : '0'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Invested</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-text-primary">
                        {userROIStats ? formatPLS(userROIStats.currentValue) : '0'}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Current Value</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className={`text-2xl font-display ${
                        (userROIStats?.roiPercent || 0) >= 0 ? 'text-fud-green' : 'text-fud-red'
                      }`}>
                        {userROIStats
                          ? `${userROIStats.roiPercent >= 0 ? '+' : ''}${userROIStats.roiPercent.toFixed(1)}%`
                          : '0%'
                        }
                      </p>
                      <p className="text-xs text-text-muted font-mono">ROI</p>
                    </div>
                    <div className="p-3 bg-dark-tertiary rounded-lg text-center">
                      <p className="text-2xl font-display text-text-primary">
                        {userROIStats?.tokenCount || 0}
                      </p>
                      <p className="text-xs text-text-muted font-mono">Tokens</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* ROI Leaderboard */}
            <Card className="bg-dark-secondary/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="text-fud-orange" size={20} />
                  Top Performers by ROI
                </CardTitle>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="text-center py-12">
                    <div className="w-8 h-8 border-2 border-fud-orange/30 border-t-fud-orange rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-text-muted font-mono text-sm">Loading...</p>
                  </div>
                ) : roiLeaderboard.length === 0 ? (
                  <div className="text-center py-12">
                    <TrendingUp className="w-16 h-16 mx-auto mb-4 text-text-muted opacity-50" />
                    <p className="text-text-muted font-mono mb-2">No trading data yet</p>
                    <p className="text-text-muted/50 text-xs font-mono mb-4">
                      Start trading to appear on the ROI leaderboard!
                    </p>
                    <Link href="/tokens">
                      <Button className="gap-2">
                        <Rocket size={16} />
                        Start Trading
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {roiLeaderboard.slice(0, 25).map((entry) => (
                      <div
                        key={entry.address}
                        className={`flex items-center gap-4 p-4 rounded-lg border transition-colors ${getRankBg(entry.rank)}`}
                      >
                        <div className="w-8 flex items-center justify-center">
                          {getRankIcon(entry.rank)}
                        </div>
                        <div className="flex-1">
                          <p className="font-mono text-sm text-text-primary">
                            {formatAddress(entry.address)}
                          </p>
                          <p className="text-xs text-text-muted font-mono">
                            {entry.tokenCount} tokens traded
                          </p>
                        </div>
                        <div className="text-right">
                          <p className={`font-display text-lg flex items-center justify-end gap-1 ${
                            entry.roiPercent >= 0 ? 'text-fud-green' : 'text-fud-red'
                          }`}>
                            {entry.roiPercent >= 0 ? (
                              <ArrowUpRight size={16} />
                            ) : (
                              <ArrowDownRight size={16} />
                            )}
                            {entry.roiPercent >= 0 ? '+' : ''}{entry.roiPercent.toFixed(1)}%
                          </p>
                          <p className="text-xs text-text-muted font-mono">
                            {formatPLS(entry.realizedPnL)} PLS P&L
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        )}

        {/* Liquidity Info Footer */}
        <Card className="mt-8 bg-dark-secondary/80 border-border-primary">
          <CardContent className="p-6">
            <h3 className="font-display text-lg text-text-primary mb-4 text-center">
              🔥 Graduation Liquidity Distribution
            </h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="p-3 bg-dark-tertiary rounded-lg">
                <p className="text-2xl font-display text-fud-green">10%</p>
                <p className="text-xs text-text-muted font-mono">PulseX V2</p>
              </div>
              <div className="p-3 bg-dark-tertiary rounded-lg">
                <p className="text-2xl font-display text-fud-purple">10%</p>
                <p className="text-xs text-text-muted font-mono">Paisley Swap V2</p>
              </div>
              <div className="p-3 bg-dark-tertiary rounded-lg">
                <p className="text-2xl font-display text-fud-orange">🔥</p>
                <p className="text-xs text-text-muted font-mono">LP Burned</p>
              </div>
              <div className="p-3 bg-dark-tertiary rounded-lg">
                <p className="text-2xl font-display text-yellow-400">♾️</p>
                <p className="text-xs text-text-muted font-mono">Trade Forever</p>
              </div>
            </div>
            <p className="text-center text-text-muted text-xs font-mono mt-4">
              Liquidity is burned to the dead address - tokens trade forever on DEXs
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
