'use client';

import dynamic from 'next/dynamic';

const WFudDashboard = dynamic(
  () => import('@/components/wfud/WFudDashboard').then((mod) => mod.WFudDashboard || mod.default),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-fud-purple border-t-transparent rounded-full animate-spin" />
          <span className="text-fud-purple text-lg animate-pulse font-display">Loading wFUD Dashboard...</span>
        </div>
      </div>
    ),
  }
);

export default function WFudPage() {
  return <WFudDashboard />;
}
