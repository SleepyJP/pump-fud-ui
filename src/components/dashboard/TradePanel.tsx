'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt, usePublicClient } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther, formatEther, erc20Abi, maxUint256 } from 'viem';
import { TOKEN_ABI, BONDING_CURVE_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatPLS } from '@/lib/utils';
import { ArrowDownUp, Loader2, Wallet, Flame, Zap, TrendingUp, CheckCircle } from 'lucide-react';
import {
  ROUTERS,
  ROUTER_ABI,
  WPLS,
  getBestQuote,
  calculateMinOutput,
  getDeadline,
  type RouteQuote,
} from '@/lib/routers';

const DEAD_ADDRESS = '0x000000000000000000000000000000000000dEaD' as const;

interface TradePanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  graduated?: boolean;
}

type TradeMode = 'buy' | 'sell' | 'burn';

export function TradePanel({ tokenAddress, tokenSymbol = 'TOKEN', graduated = false }: TradePanelProps) {
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');
  const [dexQuote, setDexQuote] = useState<RouteQuote | null>(null);
  const [isLoadingDexQuote, setIsLoadingDexQuote] = useState(false);
  const [isApproving, setIsApproving] = useState(false);

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: plsBalance } = useBalance({ address });
  const publicClient = usePublicClient();

  const { data: tokenBalanceRaw } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
  const tokenBalance = tokenBalanceRaw as bigint | undefined;

  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!tokenAddress },
  });

  // Get the router to use for graduated tokens - use quote's router (Paisley first, PulseX fallback)
  const activeRouter = dexQuote?.router || ROUTERS.PAISLEY_V2;

  const parsedAmount = useMemo(() => {
    try {
      return amount && parseFloat(amount) > 0 ? parseEther(amount) : BigInt(0);
    } catch {
      return BigInt(0);
    }
  }, [amount]);

  const { data: buyQuote } = useReadContract({
    address: CONTRACTS.BONDING_CURVE as `0x${string}`,
    abi: BONDING_CURVE_ABI,
    functionName: 'calculatePurchaseReturn',
    args: [totalSupply || BigInt(0), parsedAmount],
    query: { enabled: !!tokenAddress && mode === 'buy' && parsedAmount > BigInt(0) && totalSupply !== undefined },
  });

  const { data: sellQuote } = useReadContract({
    address: CONTRACTS.BONDING_CURVE as `0x${string}`,
    abi: BONDING_CURVE_ABI,
    functionName: 'calculateSaleReturn',
    args: [totalSupply || BigInt(0), parsedAmount],
    query: { enabled: !!tokenAddress && mode === 'sell' && parsedAmount > BigInt(0) && totalSupply !== undefined },
  });

  // 5% slippage default
  const minBuyTokens = buyQuote ? (buyQuote * BigInt(9500)) / BigInt(10000) : BigInt(0);
  const minSellPls = sellQuote ? (sellQuote * BigInt(9500)) / BigInt(10000) : BigInt(0);

  // Check allowance for DEX router (needed for graduated token sells)
  const { data: routerAllowance, refetch: refetchAllowance } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'allowance',
    args: address && tokenAddress ? [address, activeRouter] : undefined,
    query: { enabled: !!tokenAddress && !!address && graduated && mode === 'sell' },
  });

  // Does user need to approve?
  const needsApproval = graduated && mode === 'sell' && parsedAmount > BigInt(0) &&
    (routerAllowance === undefined || (routerAllowance as bigint) < parsedAmount);

  // Fetch DEX quote - Paisley V2 first, fallback to PulseX V2
  const fetchDexQuote = useCallback(async () => {
    if (!publicClient || !tokenAddress || !graduated || parsedAmount <= BigInt(0)) {
      setDexQuote(null);
      return;
    }

    setIsLoadingDexQuote(true);
    try {
      const tokenIn = mode === 'buy' ? WPLS : tokenAddress;
      const tokenOut = mode === 'buy' ? tokenAddress : WPLS;
      const path: `0x${string}`[] = [tokenIn, tokenOut];

      // Try Paisley V2 first (preferred)
      try {
        const paisleyAmounts = await publicClient.readContract({
          address: ROUTERS.PAISLEY_V2,
          abi: ROUTER_ABI,
          functionName: 'getAmountsOut',
          args: [parsedAmount, path],
        }) as bigint[];

        if (paisleyAmounts[paisleyAmounts.length - 1] > BigInt(0)) {
          setDexQuote({
            router: ROUTERS.PAISLEY_V2,
            routerName: 'Paisley V2',
            amountOut: paisleyAmounts[paisleyAmounts.length - 1],
            path,
          });
          return;
        }
      } catch {
        // Paisley has no liquidity, fall through to PulseX
      }

      // Fallback to PulseX V2 if Paisley has no liquidity
      const amounts = await publicClient.readContract({
        address: ROUTERS.PULSEX_V2,
        abi: ROUTER_ABI,
        functionName: 'getAmountsOut',
        args: [parsedAmount, path],
      }) as bigint[];

      setDexQuote({
        router: ROUTERS.PULSEX_V2,
        routerName: 'PulseX V2',
        amountOut: amounts[amounts.length - 1],
        path,
      });
    } catch {
      setDexQuote(null);
    } finally {
      setIsLoadingDexQuote(false);
    }
  }, [publicClient, tokenAddress, graduated, parsedAmount, mode]);

  useEffect(() => {
    if (graduated && parsedAmount > BigInt(0)) {
      const debounce = setTimeout(fetchDexQuote, 300);
      return () => clearTimeout(debounce);
    }
  }, [graduated, parsedAmount, fetchDexQuote]);

  const { writeContract, data: hash, isPending, reset, error: writeError } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError, error: txError } = useWaitForTransactionReceipt({ hash });

  // Track if we just completed an approval to trigger swap
  const [pendingSwapAfterApproval, setPendingSwapAfterApproval] = useState(false);

  useEffect(() => {
    if (isSuccess) {
      // If we just approved, refetch allowance and trigger the swap
      if (isApproving) {
        setIsApproving(false);
        refetchAllowance().then(() => {
          setPendingSwapAfterApproval(true);
        });
      } else {
        setAmount('');
        setTimeout(() => reset(), 2000);
      }
    }
  }, [isSuccess, reset, isApproving, refetchAllowance]);

  // Execute the swap after approval completes
  useEffect(() => {
    if (pendingSwapAfterApproval && !isPending && !isConfirming) {
      setPendingSwapAfterApproval(false);
      reset();
      // Small delay to let state settle
      setTimeout(() => {
        executeSwap();
      }, 500);
    }
  }, [pendingSwapAfterApproval, isPending, isConfirming]);

  const executeSwap = () => {
    if (!tokenAddress || parsedAmount <= BigInt(0)) return;
    const router = activeRouter;
    const deadline = getDeadline(20);
    const slippageBps = 500; // 5%

    if (mode === 'buy') {
      const minOut = dexQuote ? calculateMinOutput(dexQuote.amountOut, slippageBps) : minBuyTokens;
      writeContract({
        address: router,
        abi: ROUTER_ABI,
        functionName: 'swapExactETHForTokensSupportingFeeOnTransferTokens',
        args: [minOut, [WPLS, tokenAddress], address!, deadline],
        value: parsedAmount,
      });
    } else {
      const minOut = dexQuote ? calculateMinOutput(dexQuote.amountOut, slippageBps) : minSellPls;
      writeContract({
        address: router,
        abi: ROUTER_ABI,
        functionName: 'swapExactTokensForETHSupportingFeeOnTransferTokens',
        args: [parsedAmount, minOut, [tokenAddress, WPLS], address!, deadline],
      });
    }
  };

  const handleApprove = () => {
    if (!tokenAddress) return;
    setIsApproving(true);
    writeContract({
      address: tokenAddress,
      abi: erc20Abi,
      functionName: 'approve',
      args: [activeRouter, maxUint256],
    });
  };

  const handleTrade = () => {
    if (!tokenAddress || parsedAmount <= BigInt(0)) return;

    // ═══════════════════════════════════════════════════════════════════
    // GRADUATED TOKEN - Route through best DEX router
    // ═══════════════════════════════════════════════════════════════════
    if (graduated && mode !== 'burn') {
      // Check if we need approval first for sells
      if (needsApproval) {
        handleApprove();
        return;
      }
      executeSwap();
      return;
    }

    // ═══════════════════════════════════════════════════════════════════
    // NON-GRADUATED TOKEN - Route through bonding curve
    // ═══════════════════════════════════════════════════════════════════
    if (mode === 'buy') {
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'buy',
        args: [minBuyTokens],
        value: parsedAmount,
      });
    } else if (mode === 'sell') {
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'sell',
        args: [parsedAmount, minSellPls],
      });
    } else if (mode === 'burn') {
      // Burn = transfer to dead address
      writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [DEAD_ADDRESS, parsedAmount],
      });
    }
  };

  const setPercent = (pct: number) => {
    if (mode === 'buy' && plsBalance) {
      const available = plsBalance.value - parseEther('10');
      if (available > BigInt(0)) setAmount(formatEther((available * BigInt(pct)) / BigInt(100)));
    } else if ((mode === 'sell' || mode === 'burn') && tokenBalance) {
      setAmount(formatEther((tokenBalance * BigInt(pct)) / BigInt(100)));
    }
  };

  // Quote: use DEX quote for graduated, bonding curve for non-graduated
  const quote = graduated && dexQuote
    ? `≈ ${formatPLS(dexQuote.amountOut)} ${mode === 'buy' ? tokenSymbol : 'PLS'}`
    : mode === 'buy' && buyQuote
    ? `≈ ${formatPLS(buyQuote)} ${tokenSymbol}`
    : mode === 'sell' && sellQuote
    ? `≈ ${formatPLS(sellQuote)} PLS`
    : null;

  const isDisabled = !isConnected || !tokenAddress || parsedAmount <= BigInt(0) || isPending || isConfirming;

  return (
    <div className="h-full flex flex-col bg-black">
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {/* CONNECT WALLET - AT TOP */}
      {/* ═══════════════════════════════════════════════════════════════════ */}
      {!isConnected && (
        <div className="p-3 border-b border-gray-800">
          <button
            onClick={openConnectModal}
            className="w-full py-3 rounded-lg font-mono font-bold bg-[#d6ffe0] text-black hover:bg-[#d6ffe0]/80 flex items-center justify-center gap-2"
          >
            <Wallet size={16} />
            Connect Wallet
          </button>
        </div>
      )}

      {/* Mode Toggle - BUY / SELL / BURN */}
      <div className="flex border-b border-gray-800">
        <button
          onClick={() => { setMode('buy'); setAmount(''); }}
          className={`flex-1 py-2 text-xs font-mono font-bold transition-all ${
            mode === 'buy' ? 'bg-[#d6ffe0]/20 text-[#d6ffe0] border-b-2 border-[#d6ffe0]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => { setMode('sell'); setAmount(''); }}
          className={`flex-1 py-2 text-xs font-mono font-bold transition-all ${
            mode === 'sell' ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          SELL
        </button>
        <button
          onClick={() => { setMode('burn'); setAmount(''); }}
          className={`flex-1 py-2 text-xs font-mono font-bold transition-all flex items-center justify-center gap-1 ${
            mode === 'burn' ? 'bg-red-500/20 text-red-400 border-b-2 border-red-500' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          <Flame size={12} /> BURN
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-3 flex flex-col gap-2">
        {/* Balance */}
        {isConnected && (
          <div className="flex justify-between text-xs font-mono">
            <span className="text-gray-500">Balance:</span>
            <span className="text-gray-300">
              {mode === 'buy'
                ? `${plsBalance ? formatPLS(plsBalance.value) : '0'} PLS`
                : `${tokenBalance ? formatPLS(tokenBalance) : '0'} ${tokenSymbol}`}
            </span>
          </div>
        )}

        {/* Burn warning */}
        {mode === 'burn' && (
          <div className="text-[10px] text-red-400 bg-red-500/10 px-2 py-1 rounded font-mono text-center">
            ⚠️ Tokens sent to dead address are PERMANENTLY destroyed
          </div>
        )}

        {/* Amount Input */}
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setAmount(e.target.value)}
            placeholder="0.0"
            disabled={!isConnected}
            className="w-full px-3 py-3 bg-gray-900 border border-gray-700 rounded-lg font-mono text-lg text-white placeholder:text-gray-600 focus:outline-none focus:border-[#d6ffe0]/50 disabled:opacity-50"
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-gray-500">
            {mode === 'buy' ? 'PLS' : tokenSymbol}
          </span>
        </div>

        {/* Quick % Buttons */}
        {isConnected && (
          <div className="flex gap-1">
            {[25, 50, 75, 100].map((pct) => (
              <button
                key={pct}
                onClick={() => setPercent(pct)}
                className="flex-1 py-1 text-[10px] font-mono bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white"
              >
                {pct}%
              </button>
            ))}
          </div>
        )}

        {/* Quote */}
        {parsedAmount > BigInt(0) && quote && (
          <div className="text-center py-1">
            <span className={`text-sm font-mono font-bold ${mode === 'buy' ? 'text-[#d6ffe0]' : 'text-orange-400'}`}>
              {isLoadingDexQuote ? '...' : quote}
            </span>
          </div>
        )}

        {/* Route indicator */}
        {mode !== 'burn' && (
          <div className="text-[10px] font-mono text-center py-1">
            {graduated ? (
              <div className="flex items-center justify-center gap-1 text-[#26a69a]">
                <Zap size={10} className="animate-pulse" />
                <span>via {dexQuote?.routerName || 'DEX'}</span>
                <span className="text-gray-500">(LIVE)</span>
              </div>
            ) : (
              <span className="text-yellow-400/70">via PUMP.FUD curve</span>
            )}
          </div>
        )}

        {/* Approval indicator for graduated token sells */}
        {graduated && mode === 'sell' && needsApproval && parsedAmount > BigInt(0) && (
          <div className="text-center text-[10px] font-mono py-1 rounded text-blue-400 bg-blue-500/10">
            ⚡ Approval required for DEX swap
          </div>
        )}

        {/* Status */}
        {(isPending || isConfirming || isSuccess || isError || writeError) && (
          <div className={`text-center text-[10px] font-mono py-1 rounded ${
            isSuccess ? 'text-[#d6ffe0] bg-[#d6ffe0]/10' : (isError || writeError) ? 'text-red-400 bg-red-500/10' : 'text-yellow-400 bg-yellow-500/10'
          }`}>
            {isPending
              ? (isApproving ? 'Approve in wallet...' : 'Confirm in wallet...')
              : isConfirming
              ? (isApproving ? 'Approving...' : 'Processing...')
              : isSuccess
              ? (isApproving ? 'Approved! Swapping...' : 'Success!')
              : writeError
              ? `Error: ${writeError.message?.slice(0, 80) || 'Transaction rejected'}`
              : txError
              ? `Failed: ${txError.message?.slice(0, 80) || 'Transaction reverted'}`
              : 'Failed'}
          </div>
        )}

        {/* Action Button - only if connected */}
        {isConnected && (
          <button
            onClick={handleTrade}
            disabled={isDisabled}
            className={`w-full py-3 rounded-lg font-mono font-bold flex items-center justify-center gap-2 ${
              needsApproval && graduated && mode === 'sell'
                ? 'bg-blue-500 text-white hover:bg-blue-400'
                : mode === 'buy'
                ? 'bg-[#d6ffe0] text-black hover:bg-[#d6ffe0]/80'
                : mode === 'sell'
                ? 'bg-orange-500 text-black hover:bg-orange-400'
                : 'bg-red-500 text-white hover:bg-red-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending || isConfirming ? (
              <Loader2 size={16} className="animate-spin" />
            ) : needsApproval && graduated && mode === 'sell' ? (
              <CheckCircle size={16} />
            ) : mode === 'burn' ? (
              <Flame size={16} />
            ) : (
              <ArrowDownUp size={16} />
            )}
            {needsApproval && graduated && mode === 'sell'
              ? `APPROVE ${tokenSymbol}`
              : mode === 'buy'
              ? 'BUY'
              : mode === 'sell'
              ? 'SELL'
              : 'BURN'} {needsApproval && graduated && mode === 'sell' ? '' : tokenSymbol}
          </button>
        )}
      </div>
    </div>
  );
}
