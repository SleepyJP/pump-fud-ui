'use client';

import { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useParams } from 'next/navigation';
import { isAddress } from 'viem';

// Error boundary wrapper for the dynamic import
const TokenDashboard = dynamic(
  () => import('@/components/dashboard/TokenDashboard')
    .then(mod => {
      console.log('[TokenPage] TokenDashboard module loaded:', mod);
      return mod.TokenDashboard || mod.default;
    })
    .catch(err => {
      console.error('[TokenPage] Failed to load TokenDashboard:', err);
      // Return a fallback component
      return function ErrorFallback() {
        return (
          <div className="min-h-screen bg-black flex items-center justify-center">
            <div className="text-center p-8 max-w-lg">
              <h1 className="text-2xl text-red-500 mb-4">Dashboard Load Error</h1>
              <p className="text-gray-400 mb-4 font-mono text-sm">
                {String(err)}
              </p>
              <button
                onClick={() => window.location.reload()}
                className="px-4 py-2 bg-[#39ff14] text-black rounded font-mono"
              >
                Reload Page
              </button>
            </div>
          </div>
        );
      };
    }),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-3 border-[#39ff14] border-t-transparent rounded-full animate-spin" />
          <span className="text-[#39ff14] text-lg animate-pulse font-mono">Loading Token Dashboard...</span>
        </div>
      </div>
    ),
  }
);

export default function TokenPage() {
  const params = useParams();
  const address = params?.address as string;
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    console.log('[TokenPage] Mounting with address:', address);

    if (address && !isAddress(address)) {
      console.error('[TokenPage] Invalid address:', address);
      setError('Invalid token address');
    }

    setMounted(true);
    console.log('[TokenPage] Mounted successfully');
  }, [address]);

  // Global error handler
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      console.error('[TokenPage] Global error:', event.error);
      setError(`Runtime error: ${event.message}`);
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      console.error('[TokenPage] Unhandled rejection:', event.reason);
      setError(`Promise rejected: ${String(event.reason)}`);
    };

    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

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
        <div className="text-center max-w-lg p-8">
          <h1 className="text-2xl text-red-500 mb-4">Error</h1>
          <p className="text-gray-400 font-mono text-sm mb-4">{error}</p>
          <div className="flex gap-4 justify-center">
            <a href="/tokens" className="text-[#39ff14] hover:underline font-mono">
              ← Back to Tokens
            </a>
            <button
              onClick={() => window.location.reload()}
              className="text-[#39ff14] hover:underline font-mono"
            >
              Reload
            </button>
          </div>
        </div>
      </div>
    );
  }

  return <TokenDashboard tokenAddress={address as `0x${string}`} />;
}
