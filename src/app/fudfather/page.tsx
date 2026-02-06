'use client';

import dynamic from 'next/dynamic';

const FUDFATHER_ADDRESS = '0x19F09e6fEaeb12Db0EDE352450aBA2610d348a43' as const;

const TokenDashboard = dynamic(
  () => import('@/components/dashboard/TokenDashboard').then(mod => mod.TokenDashboard || mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#d6ffe0] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#d6ffe0] text-lg animate-pulse font-display">Loading THE FUDFATHER...</span>
        </div>
      </div>
    ),
  }
);

export default function FudfatherPage() {
  return <TokenDashboard tokenAddress={FUDFATHER_ADDRESS} />;
}
