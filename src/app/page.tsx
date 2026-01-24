'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { Sparkles, Trophy, TrendingUp, Clock, Crown, Hammer, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LiveTokensList } from '@/components/token/LiveTokensList';

// Dev wallet that can see admin controls
const DEV_WALLET = '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B'.toLowerCase();

type FilterType = 'live' | 'rising' | 'new' | 'graduated';

const FILTER_CONFIG: Record<FilterType, { label: string; icon: React.ReactNode }> = {
  live: { label: 'Live', icon: <span className="w-2 h-2 bg-fud-green rounded-full animate-pulse" /> },
  rising: { label: 'Rising', icon: <TrendingUp size={14} /> },
  new: { label: 'New', icon: <Clock size={14} /> },
  graduated: { label: 'Graduated', icon: <Trophy size={14} /> },
};

export default function HomePage() {
  const [activeFilter, setActiveFilter] = useState<FilterType>('live');
  const { address, isConnected } = useAccount();

  // Check if connected wallet is dev wallet
  const isDevWallet = isConnected && address?.toLowerCase() === DEV_WALLET;

  return (
    <div className="min-h-screen relative">
      {/* Full screen PUMP.FUD hero background */}
      <div className="fixed inset-0 -z-5">
        <Image
          src="/pump-fud-hero.png"
          alt="PUMP.FUD"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* Hero Section with CTA buttons */}
      <div className="relative flex items-center justify-center min-h-[70vh]">
        <div className="flex justify-center gap-4 mt-[50vh]">
          <Link href="/launch">
            <Button size="lg" className="gap-2 text-lg px-8 py-4">
              <Sparkles size={20} />
              Launch Token
            </Button>
          </Link>
          <Link href="/tokens">
            <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-4">
              <TrendingUp size={20} />
              Browse Tokens
            </Button>
          </Link>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 pb-8">
        {/* Filter Tabs */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex gap-2">
            {(Object.keys(FILTER_CONFIG) as FilterType[]).map((filter) => (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                  activeFilter === filter
                    ? 'bg-fud-green/20 text-fud-green border border-fud-green/50'
                    : 'bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-green/30 hover:text-text-secondary'
                }`}
              >
                {FILTER_CONFIG[filter].icon}
                {FILTER_CONFIG[filter].label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <Link href="/leaderboard">
              <Button variant="secondary" className="gap-2">
                <Crown size={16} />
                Leaderboard
              </Button>
            </Link>
            <Link href="/launch">
              <Button className="gap-2">
                <Hammer size={16} />
                Forge Token
              </Button>
            </Link>
          </div>
        </div>

        {/* Token List */}
        <LiveTokensList
          limit={12}
          showTitle={true}
          filter={activeFilter}
        />

        {/* Unlock UI Button - ONLY visible to dev wallet */}
        {isDevWallet && (
          <div className="fixed bottom-4 right-4">
            <Link href="/settings">
              <Button variant="secondary" className="gap-2">
                <Settings size={16} />
                Admin Settings
              </Button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
