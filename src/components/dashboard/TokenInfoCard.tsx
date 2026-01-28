'use client';

import { formatEther } from 'viem';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface TokenInfoCardProps {
  tokenAddress: `0x${string}`;
  currentPrice?: bigint;
  totalSupply?: bigint;
  plsReserve?: bigint;
  graduated?: boolean;
  buyCount?: number;
  sellCount?: number;
}

const GRADUATION_THRESHOLD = BigInt(50_000_000) * BigInt(10 ** 18); // 50M PLS

export function TokenInfoCard({
  tokenAddress,
  currentPrice,
  totalSupply,
  plsReserve,
  graduated,
  buyCount = 0,
  sellCount = 0,
}: TokenInfoCardProps) {
  const formatPrice = (price: bigint | undefined) => {
    if (!price) return '--';
    const formatted = formatEther(price);
    const num = parseFloat(formatted);
    if (num < 0.00000001) return num.toExponential(4);
    if (num < 0.0001) return num.toFixed(10);
    return num.toFixed(8);
  };

  const formatPLS = (amount: bigint | undefined) => {
    if (!amount) return '--';
    const num = Number(formatEther(amount));
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    if (num >= 1_000) return (num / 1_000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  const formatSupply = (supply: bigint | undefined) => {
    if (!supply) return '--';
    const num = Number(formatEther(supply));
    if (num >= 1_000_000_000) return (num / 1_000_000_000).toFixed(2) + 'B';
    if (num >= 1_000_000) return (num / 1_000_000).toFixed(2) + 'M';
    return num.toFixed(0);
  };

  const bondingProgress = plsReserve
    ? Math.min(100, Number((plsReserve * BigInt(100)) / GRADUATION_THRESHOLD))
    : 0;

  return (
    <div className="h-full p-4 flex flex-col">
      {/* Price */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-sm">Price</span>
        <span className="text-[#39ff14] font-mono font-bold">{formatPrice(currentPrice)} PLS</span>
      </div>

      {/* Reserve */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-sm">Reserve</span>
        <span className="text-white font-mono">{formatPLS(plsReserve)} PLS</span>
      </div>

      {/* Supply */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-sm">Supply</span>
        <span className="text-white font-mono">{formatSupply(totalSupply)}</span>
      </div>

      {/* Buys / Sells */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <div className="flex items-center gap-1 text-[#39ff14]">
          <TrendingUp size={12} />
          <span className="text-sm">BUYS</span>
        </div>
        <span className="text-[#39ff14] font-mono font-bold">{buyCount}</span>
      </div>

      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <div className="flex items-center gap-1 text-red-500">
          <TrendingDown size={12} />
          <span className="text-sm">SELLS</span>
        </div>
        <span className="text-red-500 font-mono font-bold">{sellCount}</span>
      </div>

      {/* Status */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-sm">Status</span>
        <span className={`font-mono font-bold ${graduated ? 'text-[#39ff14]' : 'text-orange-400'}`}>
          {graduated ? 'GRADUATED' : 'BONDING'}
        </span>
      </div>

      {/* Bonding Progress */}
      {!graduated && (
        <div className="mt-auto pt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Bonding Progress</span>
            <span className="text-[#39ff14]">{bondingProgress.toFixed(1)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#39ff14] transition-all"
              style={{ width: `${bondingProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
