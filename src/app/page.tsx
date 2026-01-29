'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAccount } from 'wagmi';
import { Sparkles, TrendingUp, Settings } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { isAdminWallet } from '@/stores/siteSettingsStore';

export default function HomePage() {
  const { address, isConnected } = useAccount();

  // Check if connected wallet is admin
  const isAdmin = isConnected && isAdminWallet(address);

  return (
    <div className="relative" style={{ height: 'calc(100vh - 64px - 120px)' }}>
      {/* Full screen PUMP.FUD hero background */}
      <div className="absolute inset-0 -z-5">
        <Image
          src="/pump-fud-hero.png"
          alt="PUMP.FUD"
          fill
          priority
          className="object-cover object-center"
          sizes="100vw"
        />
      </div>

      {/* Hero Section - buttons centered in lower third */}
      <div className="relative h-full flex items-end justify-center pb-8">
        <div className="flex justify-center gap-4">
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

      {/* Admin Settings - ONLY visible to admin wallets */}
      {isAdmin && (
        <div className="fixed bottom-28 right-4 z-50">
          <Link href="/settings">
            <Button variant="primary" className="gap-2 shadow-lg shadow-[#39ff14]/30 animate-pulse">
              <Settings size={16} />
              Admin Settings
            </Button>
          </Link>
        </div>
      )}
    </div>
  );
}
