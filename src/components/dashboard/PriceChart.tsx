'use client';

interface PriceChartProps {
  tokenAddress?: `0x${string}`;
}

// TEMPORARILY DISABLED - isolating crash
export function PriceChart({ tokenAddress }: PriceChartProps) {
  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-gray-900 to-black">
      <div className="flex items-center justify-between px-4 py-3 border-b border-green-500/20">
        <div className="flex items-center gap-3">
          <span className="text-green-400 text-lg">📊</span>
          <span className="font-mono text-sm text-green-400">PRICE CHART</span>
        </div>
      </div>
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center p-4">
          <div className="text-6xl mb-4">🔧</div>
          <p className="text-gray-400 text-sm font-mono mb-2">Chart under maintenance</p>
          <p className="text-gray-500 text-xs font-mono">Token: {tokenAddress?.slice(0,10)}...</p>
        </div>
      </div>
    </div>
  );
}
