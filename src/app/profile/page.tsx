'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAccount, useReadContract, useReadContracts, useBalance } from 'wagmi';
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
  Edit3,
  Save,
  X,
  Camera,
  Twitter,
  Globe,
  MessageCircle,
  Crown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { FACTORY_ABI, TOKEN_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatAddress, formatPLS } from '@/lib/utils';
import { useProfileStore } from '@/stores/profileStore';

interface TokenInfo {
  address: `0x${string}`;
  name: string;
  symbol: string;
  creator: `0x${string}`;
  graduated: boolean;
  reserveBalance: bigint;
  createdAt: number;
}

export default function ProfilePage() {
  const { address, isConnected } = useAccount();
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'created' | 'graduated' | 'holdings' | 'activity'>('created');
  const [allTokens, setAllTokens] = useState<TokenInfo[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Profile editing state
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editTwitter, setEditTwitter] = useState('');
  const [editTelegram, setEditTelegram] = useState('');
  const [editWebsite, setEditWebsite] = useState('');

  // Profile store
  const { getProfile, setProfile } = useProfileStore();
  const profile = address ? getProfile(address) : null;

  // Get PLS balance
  const { data: plsBalance } = useBalance({
    address: address,
  });

  // V1: Get token count from factory
  const { data: tokenCount } = useReadContract({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'tokenCount',
    query: { enabled: !!CONTRACTS.FACTORY && isConnected },
  });

  // V1: Build multicall to fetch each token address by index
  const tokenIndexContracts = Array.from({ length: Math.min(Number(tokenCount || 0), 200) }, (_, i) => ({
    address: CONTRACTS.FACTORY,
    abi: FACTORY_ABI,
    functionName: 'tokens',
    args: [BigInt(i)],
  }));

  const { data: tokenAddressResults } = useReadContracts({
    contracts: tokenIndexContracts as any,
    query: { enabled: Number(tokenCount || 0) > 0 && isConnected },
  });

  // Extract addresses from multicall results
  const tokenAddresses = (tokenAddressResults || [])
    .map((r) => r.result as `0x${string}`)
    .filter(Boolean);

  // V1: Build multicall to get token data from each token contract
  const tokenDataContracts = (tokenAddresses || []).flatMap((addr) => [
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'name' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'symbol' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'creator' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'graduated' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'deleted' },
    { address: addr as `0x${string}`, abi: TOKEN_ABI, functionName: 'plsReserve' },
  ]);

  const { data: tokenData } = useReadContracts({
    contracts: tokenDataContracts as any,
    query: { enabled: tokenDataContracts.length > 0 },
  });

  // Process tokens from V2 multicall results
  useEffect(() => {
    if (!tokenAddresses || tokenAddresses.length === 0 || !tokenData) {
      setAllTokens([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const tokens: TokenInfo[] = [];
    const fieldsPerToken = 6; // name, symbol, creator, graduated, deleted, plsReserve

    for (let i = 0; i < tokenAddresses.length; i++) {
      const baseIndex = i * fieldsPerToken;
      const name = tokenData[baseIndex]?.result as string;
      const symbol = tokenData[baseIndex + 1]?.result as string;
      const creator = tokenData[baseIndex + 2]?.result as `0x${string}`;
      const graduated = tokenData[baseIndex + 3]?.result as boolean || false;
      const deleted = tokenData[baseIndex + 4]?.result as boolean || false;
      const plsReserve = tokenData[baseIndex + 5]?.result as bigint || BigInt(0);

      // Skip deleted tokens
      if (deleted) continue;

      if (name && symbol) {
        tokens.push({
          address: tokenAddresses[i] as `0x${string}`,
          name,
          symbol,
          creator: creator || '0x0000000000000000000000000000000000000000',
          graduated,
          reserveBalance: plsReserve,
          createdAt: 0, // V2 doesn't store createdAt on-chain
        });
      }
    }
    setAllTokens(tokens);
    setIsLoading(false);
  }, [tokenAddresses, tokenData]);

  // Filter tokens by creator (tokens this wallet created)
  const createdTokens = useMemo(() => {
    if (!address) return [];
    return allTokens.filter(
      (t) => t.creator.toLowerCase() === address.toLowerCase()
    );
  }, [allTokens, address]);

  // Graduated tokens created by this wallet
  const graduatedTokens = useMemo(() => {
    return createdTokens.filter((t) => t.graduated);
  }, [createdTokens]);

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Start editing
  const startEditing = () => {
    setEditName(profile?.displayName || '');
    setEditBio(profile?.bio || '');
    setEditAvatar(profile?.avatarUrl || '');
    setEditTwitter(profile?.socialLinks?.twitter || '');
    setEditTelegram(profile?.socialLinks?.telegram || '');
    setEditWebsite(profile?.socialLinks?.website || '');
    setIsEditing(true);
  };

  // Save profile
  const saveProfile = () => {
    if (!address) return;
    setProfile(address, {
      displayName: editName,
      bio: editBio,
      avatarUrl: editAvatar,
      socialLinks: {
        twitter: editTwitter || undefined,
        telegram: editTelegram || undefined,
        website: editWebsite || undefined,
      },
    });
    setIsEditing(false);
  };

  // Cancel editing
  const cancelEditing = () => {
    setIsEditing(false);
  };

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
            {isEditing ? (
              // Edit Mode
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="font-display text-xl text-fud-green">Edit Profile</h2>
                  <div className="flex gap-2">
                    <Button onClick={cancelEditing} variant="secondary" className="gap-2">
                      <X size={16} />
                      Cancel
                    </Button>
                    <Button onClick={saveProfile} className="gap-2">
                      <Save size={16} />
                      Save
                    </Button>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* Left Column - Basic Info */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-text-muted mb-2">
                        Display Name
                      </label>
                      <Input
                        value={editName}
                        onChange={(e) => setEditName(e.target.value)}
                        placeholder="Your display name..."
                        maxLength={32}
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-text-muted mb-2">
                        Bio / Description
                      </label>
                      <textarea
                        value={editBio}
                        onChange={(e) => setEditBio(e.target.value)}
                        placeholder="Tell us about yourself..."
                        maxLength={280}
                        rows={3}
                        className="w-full px-3 py-2 bg-dark-secondary border border-border-primary rounded-lg text-text-primary font-mono text-sm resize-none focus:border-fud-green/50 focus:outline-none"
                      />
                      <p className="text-xs text-text-muted mt-1">{editBio.length}/280</p>
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-text-muted mb-2">
                        <Camera size={12} className="inline mr-1" />
                        Profile Image URL
                      </label>
                      <Input
                        value={editAvatar}
                        onChange={(e) => setEditAvatar(e.target.value)}
                        placeholder="https://... (image URL)"
                      />
                      {editAvatar && (
                        <div className="mt-2">
                          <img
                            src={editAvatar}
                            alt="Preview"
                            className="w-16 h-16 rounded-xl object-cover border border-fud-green/30"
                            onError={(e) => {
                              (e.target as HTMLImageElement).style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Right Column - Social Links */}
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-mono text-text-muted mb-2">
                        <Twitter size={12} className="inline mr-1" />
                        Twitter / X
                      </label>
                      <Input
                        value={editTwitter}
                        onChange={(e) => setEditTwitter(e.target.value)}
                        placeholder="https://twitter.com/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-text-muted mb-2">
                        <MessageCircle size={12} className="inline mr-1" />
                        Telegram
                      </label>
                      <Input
                        value={editTelegram}
                        onChange={(e) => setEditTelegram(e.target.value)}
                        placeholder="https://t.me/..."
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-mono text-text-muted mb-2">
                        <Globe size={12} className="inline mr-1" />
                        Website
                      </label>
                      <Input
                        value={editWebsite}
                        onChange={(e) => setEditWebsite(e.target.value)}
                        placeholder="https://..."
                      />
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              // View Mode
              <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
                {/* Avatar */}
                <div className="relative group">
                  {profile?.avatarUrl ? (
                    <img
                      src={profile.avatarUrl}
                      alt={profile.displayName || 'Profile'}
                      className="w-24 h-24 rounded-2xl object-cover border-2 border-fud-green/30"
                    />
                  ) : (
                    <div className="w-24 h-24 bg-gradient-to-br from-fud-green via-fud-purple to-fud-orange rounded-2xl flex items-center justify-center">
                      <User size={48} className="text-dark-bg" />
                    </div>
                  )}
                  <button
                    onClick={startEditing}
                    className="absolute inset-0 bg-black/60 rounded-2xl opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity"
                  >
                    <Edit3 size={24} className="text-white" />
                  </button>
                </div>

                {/* Info */}
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="font-display text-2xl text-fud-green">
                      {profile?.displayName || formatAddress(address!)}
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
                    <Button onClick={startEditing} variant="secondary" className="gap-2 ml-2">
                      <Edit3 size={14} />
                      Edit Profile
                    </Button>
                  </div>

                  {profile?.bio && (
                    <p className="text-text-secondary text-sm mb-2 max-w-xl">
                      {profile.bio}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-text-muted font-mono text-xs">
                      {formatAddress(address!)}
                    </span>
                    {profile?.socialLinks?.twitter && (
                      <a
                        href={profile.socialLinks.twitter}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fud-green hover:underline flex items-center gap-1"
                      >
                        <Twitter size={14} />
                      </a>
                    )}
                    {profile?.socialLinks?.telegram && (
                      <a
                        href={profile.socialLinks.telegram}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fud-green hover:underline flex items-center gap-1"
                      >
                        <MessageCircle size={14} />
                      </a>
                    )}
                    {profile?.socialLinks?.website && (
                      <a
                        href={profile.socialLinks.website}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-fud-green hover:underline flex items-center gap-1"
                      >
                        <Globe size={14} />
                      </a>
                    )}
                  </div>
                </div>

                {/* Balance */}
                <div className="text-right">
                  <p className="text-text-muted text-xs font-mono mb-1">PLS Balance</p>
                  <p className="font-display text-3xl text-fud-green">
                    {plsBalance ? formatPLS(plsBalance.value) : '0'} PLS
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <Card variant="bordered" className="p-4 text-center">
            <Rocket className="w-8 h-8 mx-auto mb-2 text-fud-purple" />
            <div className="text-2xl font-display text-fud-purple">{createdTokens.length}</div>
            <div className="text-xs font-mono text-text-muted">Tokens Created</div>
          </Card>
          <Card variant="bordered" className="p-4 text-center">
            <Trophy className="w-8 h-8 mx-auto mb-2 text-fud-orange" />
            <div className="text-2xl font-display text-fud-orange">{graduatedTokens.length}</div>
            <div className="text-xs font-mono text-text-muted">Graduated</div>
          </Card>
          <Card variant="bordered" className="p-4 text-center">
            <TrendingUp className="w-8 h-8 mx-auto mb-2 text-fud-green" />
            <div className="text-2xl font-display text-fud-green">
              {createdTokens.length > 0
                ? formatPLS(createdTokens.reduce((acc, t) => acc + t.reserveBalance, BigInt(0)))
                : '0'}
            </div>
            <div className="text-xs font-mono text-text-muted">Total Reserve</div>
          </Card>
          <Card variant="bordered" className="p-4 text-center">
            <Crown className="w-8 h-8 mx-auto mb-2 text-yellow-400" />
            <div className="text-2xl font-display text-yellow-400">
              {graduatedTokens.length > 0 ? Math.round((graduatedTokens.length / createdTokens.length) * 100) : 0}%
            </div>
            <div className="text-xs font-mono text-text-muted">Success Rate</div>
          </Card>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-6 border-b border-border-primary pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('created')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors whitespace-nowrap ${
              activeTab === 'created'
                ? 'bg-fud-purple/20 text-fud-purple border-b-2 border-fud-purple'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Rocket size={16} />
            My Tokens ({createdTokens.length})
          </button>
          <button
            onClick={() => setActiveTab('graduated')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors whitespace-nowrap ${
              activeTab === 'graduated'
                ? 'bg-fud-orange/20 text-fud-orange border-b-2 border-fud-orange'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Trophy size={16} />
            Graduated ({graduatedTokens.length})
          </button>
          <button
            onClick={() => setActiveTab('holdings')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors whitespace-nowrap ${
              activeTab === 'holdings'
                ? 'bg-fud-green/20 text-fud-green border-b-2 border-fud-green'
                : 'text-text-muted hover:text-text-primary'
            }`}
          >
            <Coins size={16} />
            Holdings
          </button>
          <button
            onClick={() => setActiveTab('activity')}
            className={`flex items-center gap-2 px-4 py-2 rounded-t-lg font-mono text-sm transition-colors whitespace-nowrap ${
              activeTab === 'activity'
                ? 'bg-fud-green/20 text-fud-green border-b-2 border-fud-green'
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
            {isLoading ? (
              <div className="text-center py-12">
                <div className="w-8 h-8 border-2 border-fud-green/30 border-t-fud-green rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-muted font-mono text-sm">Loading...</p>
              </div>
            ) : activeTab === 'created' ? (
              <div>
                {createdTokens.length === 0 ? (
                  <div className="text-center py-12">
                    <Rocket className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                    <p className="text-text-muted font-mono text-sm mb-4">
                      You haven&apos;t created any tokens yet
                    </p>
                    <Link href="/launch">
                      <Button className="gap-2">
                        <Rocket size={16} />
                        Launch Your First Token
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {createdTokens.map((token) => (
                      <Link
                        key={token.address}
                        href={`/token/${token.address}`}
                        className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg hover:bg-dark-tertiary transition-colors"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-fud-purple/20 rounded-lg flex items-center justify-center">
                            <span className="text-fud-purple font-mono text-sm">
                              {token.symbol.slice(0, 2)}
                            </span>
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="text-text-primary font-mono">{token.name}</p>
                              {token.graduated && (
                                <span className="px-2 py-0.5 bg-fud-orange/20 text-fud-orange text-xs font-mono rounded">
                                  GRADUATED
                                </span>
                              )}
                            </div>
                            <p className="text-text-muted text-xs font-mono">${token.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-fud-green font-mono">{formatPLS(token.reserveBalance)} PLS</p>
                          <p className="text-text-muted text-xs font-mono">Reserve</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'graduated' ? (
              <div>
                {graduatedTokens.length === 0 ? (
                  <div className="text-center py-12">
                    <Trophy className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                    <p className="text-text-muted font-mono text-sm mb-2">
                      No graduated tokens yet
                    </p>
                    <p className="text-text-muted/50 text-xs font-mono">
                      Tokens graduate when they reach 50M PLS in the bonding curve
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {graduatedTokens.map((token) => (
                      <Link
                        key={token.address}
                        href={`/token/${token.address}`}
                        className="flex items-center justify-between p-4 bg-dark-secondary rounded-lg hover:bg-dark-tertiary transition-colors border border-fud-orange/30"
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-fud-orange/20 rounded-lg flex items-center justify-center">
                            <Trophy className="text-fud-orange" size={20} />
                          </div>
                          <div>
                            <p className="text-text-primary font-mono">{token.name}</p>
                            <p className="text-text-muted text-xs font-mono">${token.symbol}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-fud-orange font-mono">{formatPLS(token.reserveBalance)} PLS</p>
                          <p className="text-fud-orange/50 text-xs font-mono">Graduated ✓</p>
                        </div>
                      </Link>
                    ))}
                  </div>
                )}
              </div>
            ) : activeTab === 'holdings' ? (
              <div className="text-center py-12">
                <Coins className="w-12 h-12 mx-auto mb-3 text-text-muted" />
                <p className="text-text-muted font-mono text-sm mb-4">
                  Token balance tracking coming soon
                </p>
                <Link href="/tokens">
                  <Button variant="secondary" className="gap-2">
                    Browse Tokens
                    <ArrowUpRight size={16} />
                  </Button>
                </Link>
              </div>
            ) : (
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
