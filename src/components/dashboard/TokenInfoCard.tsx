'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useReadContract, usePublicClient } from 'wagmi';
import { formatEther, parseAbiItem } from 'viem';
import { TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { TOKEN_ABI } from '@/config/abis';
import { useBlockRefresh } from '@/hooks/useSharedBlockNumber';

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

export function TokenInfoCard({ tokenAddress }: TokenInfoCardProps) {
  const [buyCount, setBuyCount] = useState(0);
  const [sellCount, setSellCount] = useState(0);
  const isMountedRef = useRef(true);
  const publicClient = usePublicClient();

  // Fetch token data from contract
  const { data: currentPrice, refetch: refetchPrice } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'getCurrentPrice',
    query: { enabled: !!tokenAddress },
  });

  const { data: totalSupply, refetch: refetchSupply } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!tokenAddress },
  });

  const { data: plsReserve, refetch: refetchReserve } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'plsReserve',
    query: { enabled: !!tokenAddress },
  });

  const { data: graduated, refetch: refetchGraduated } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'graduated',
    query: { enabled: !!tokenAddress },
  });

  // Fetch buy/sell counts from events
  const fetchCounts = useCallback(async () => {
    if (!tokenAddress || !publicClient || !isMountedRef.current) return;

    try {
      const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address referrer)');
      const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

      const currentBlock = await publicClient.getBlockNumber();
      const fromBlock = currentBlock - BigInt(50000); // ~2 days

      const [buyLogs, sellLogs] = await Promise.all([
        publicClient.getLogs({
          address: tokenAddress,
          event: buyEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
        publicClient.getLogs({
          address: tokenAddress,
          event: sellEvent,
          fromBlock: fromBlock > BigInt(0) ? fromBlock : BigInt(0),
          toBlock: currentBlock,
        }),
      ]);

      if (isMountedRef.current) {
        setBuyCount(buyLogs.length);
        setSellCount(sellLogs.length);
      }
    } catch (err) {
      console.error('[TokenInfoCard] Error fetching counts:', err);
    }
  }, [tokenAddress, publicClient]);

  // Refresh all data
  const refreshAll = useCallback(() => {
    refetchPrice();
    refetchSupply();
    refetchReserve();
    refetchGraduated();
    fetchCounts();
  }, [refetchPrice, refetchSupply, refetchReserve, refetchGraduated, fetchCounts]);

  // Use shared block refresh
  useBlockRefresh('tokeninfo', refreshAll, 1, !!tokenAddress);

  // Initial fetch
  useEffect(() => {
    if (tokenAddress) fetchCounts();
  }, [tokenAddress]);

  // Cleanup
  useEffect(() => {
    isMountedRef.current = true;
    return () => { isMountedRef.current = false; };
  }, []);

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
        <span className="text-[#d6ffe0] font-mono font-bold">{formatPrice(currentPrice as bigint)} PLS</span>
      </div>

      {/* Reserve */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-sm">Reserve</span>
        <span className="text-white font-mono">{formatPLS(plsReserve as bigint)} PLS</span>
      </div>

      {/* Supply */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <span className="text-gray-400 text-sm">Supply</span>
        <span className="text-white font-mono">{formatSupply(totalSupply as bigint)}</span>
      </div>

      {/* Buys / Sells */}
      <div className="flex justify-between items-center py-2 border-b border-gray-800/50">
        <div className="flex items-center gap-1 text-[#d6ffe0]">
          <TrendingUp size={12} />
          <span className="text-sm">BUYS</span>
        </div>
        <span className="text-[#d6ffe0] font-mono font-bold">{buyCount}</span>
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
        <span className={`font-mono font-bold ${graduated ? 'text-[#d6ffe0]' : 'text-orange-400'}`}>
          {graduated ? 'GRADUATED' : 'BONDING'}
        </span>
      </div>

      {/* Bonding Progress */}
      {!graduated && (
        <div className="mt-auto pt-3">
          <div className="flex justify-between text-xs mb-1">
            <span className="text-gray-500">Bonding Progress</span>
            <span className="text-[#d6ffe0]">{bondingProgress.toFixed(4)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-[#d6ffe0] transition-all"
              style={{ width: `${Math.max(0.5, bondingProgress)}%` }}
            />
          </div>
          <div className="text-[10px] text-gray-500 mt-1 text-center">
            {formatPLS(plsReserve as bigint)} / 50M PLS
          </div>
        </div>
      )}
    </div>
  );
}
