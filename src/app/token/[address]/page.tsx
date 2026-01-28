'use client';
import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { isAddress } from 'viem';

const TokenDashboard = dynamic(
  () => import('@/components/dashboard/TokenDashboard').then(mod => mod.TokenDashboard || mod.default),
  { 
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#39ff14] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#39ff14] text-lg animate-pulse">Loading Token Dashboard...</span>
        </div>
      </div>
    )
  }
);

export default function TokenPage() {
  const params = useParams();
  const address = params?.address as string;
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
    if (address && !isAddress(address)) {
      setError('Invalid token address');
    }
  }, [address]);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-[#39ff14] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl text-red-500 mb-4">Error</h1>
          <p className="text-gray-400">{error}</p>
          <a href="/tokens" className="text-[#39ff14] hover:underline mt-4 inline-block">← Back to Tokens</a>
        </div>
      </div>
    );
  }

  return <TokenDashboard address={address} />;
}
