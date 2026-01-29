'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { useConnectModal } from '@rainbow-me/rainbowkit';
import { parseEther, formatEther, erc20Abi, Address } from 'viem';
import { TOKEN_ABI, BONDING_CURVE_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatPLS } from '@/lib/utils';
import { ArrowDownUp, Flame, Loader2, Wallet } from 'lucide-react';

interface TradePanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
}

type TradeMode = 'buy' | 'sell';

export function TradePanel({ tokenAddress, tokenSymbol = 'TOKEN' }: TradePanelProps) {
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');

  const { address, isConnected } = useAccount();
  const { openConnectModal } = useConnectModal();
  const { data: plsBalance } = useBalance({ address });

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

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      setAmount('');
      setTimeout(() => reset(), 2000);
    }
  }, [isSuccess, reset]);

  const handleTrade = () => {
    if (!tokenAddress || parsedAmount <= BigInt(0)) return;

    if (mode === 'buy') {
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'buy',
        args: [minBuyTokens],
        value: parsedAmount,
      });
    } else {
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'sell',
        args: [parsedAmount, minSellPls],
      });
    }
  };

  const setPercent = (pct: number) => {
    if (mode === 'buy' && plsBalance) {
      const available = plsBalance.value - parseEther('10');
      if (available > BigInt(0)) setAmount(formatEther((available * BigInt(pct)) / BigInt(100)));
    } else if (mode === 'sell' && tokenBalance) {
      setAmount(formatEther((tokenBalance * BigInt(pct)) / BigInt(100)));
    }
  };

  const quote = mode === 'buy' && buyQuote
    ? `≈ ${formatPLS(buyQuote)} ${tokenSymbol}`
    : mode === 'sell' && sellQuote
    ? `≈ ${formatPLS(sellQuote)} PLS`
    : null;

  const isDisabled = !isConnected || !tokenAddress || parsedAmount <= BigInt(0) || isPending || isConfirming;

  return (
    <div className="h-full flex flex-col bg-black/40">
      {/* Mode Toggle */}
      <div className="flex border-b border-[#39ff14]/20">
        <button
          onClick={() => { setMode('buy'); setAmount(''); }}
          className={`flex-1 py-3 text-sm font-mono font-bold transition-all ${
            mode === 'buy' ? 'bg-[#39ff14]/20 text-[#39ff14] border-b-2 border-[#39ff14]' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          BUY
        </button>
        <button
          onClick={() => { setMode('sell'); setAmount(''); }}
          className={`flex-1 py-3 text-sm font-mono font-bold transition-all ${
            mode === 'sell' ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-400' : 'text-gray-500 hover:text-gray-300'
          }`}
        >
          SELL
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 p-4 flex flex-col gap-3">
        {/* Balance */}
        <div className="flex justify-between text-xs font-mono">
          <span className="text-gray-500">Balance:</span>
          <span className="text-gray-300">
            {mode === 'buy'
              ? `${plsBalance ? formatPLS(plsBalance.value) : '0'} PLS`
              : `${tokenBalance ? formatPLS(tokenBalance) : '0'} ${tokenSymbol}`}
          </span>
        </div>

        {/* Amount Input */}
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => /^[0-9]*\.?[0-9]*$/.test(e.target.value) && setAmount(e.target.value)}
            placeholder="0.0"
            className="w-full px-4 py-4 bg-black/60 border border-gray-700 rounded-lg font-mono text-xl text-white placeholder:text-gray-600 focus:outline-none focus:border-[#39ff14]/50"
          />
          <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-mono text-gray-500">
            {mode === 'buy' ? 'PLS' : tokenSymbol}
          </span>
        </div>

        {/* Quick % Buttons */}
        <div className="flex gap-1">
          {[25, 50, 75, 100].map((pct) => (
            <button
              key={pct}
              onClick={() => setPercent(pct)}
              className="flex-1 py-1.5 text-xs font-mono bg-gray-800 text-gray-400 rounded hover:bg-gray-700 hover:text-white"
            >
              {pct}%
            </button>
          ))}
        </div>

        {/* Quote */}
        {parsedAmount > BigInt(0) && quote && (
          <div className="text-center py-2">
            <span className={`text-lg font-mono font-bold ${mode === 'buy' ? 'text-[#39ff14]' : 'text-orange-400'}`}>
              {quote}
            </span>
          </div>
        )}

        {/* Status */}
        {(isPending || isConfirming || isSuccess || isError) && (
          <div className={`text-center text-xs font-mono py-2 rounded ${
            isSuccess ? 'text-[#39ff14] bg-[#39ff14]/10' : isError ? 'text-red-400 bg-red-500/10' : 'text-yellow-400 bg-yellow-500/10'
          }`}>
            {isPending ? 'Confirm in wallet...' : isConfirming ? 'Processing...' : isSuccess ? 'Success!' : 'Failed'}
          </div>
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Action Button */}
        {!isConnected ? (
          <button
            onClick={openConnectModal}
            className="w-full py-4 rounded-lg font-mono font-bold bg-[#39ff14] text-black hover:bg-[#39ff14]/80 flex items-center justify-center gap-2"
          >
            <Wallet size={18} />
            Connect Wallet
          </button>
        ) : (
          <button
            onClick={handleTrade}
            disabled={isDisabled}
            className={`w-full py-4 rounded-lg font-mono font-bold flex items-center justify-center gap-2 ${
              mode === 'buy'
                ? 'bg-[#39ff14] text-black hover:bg-[#39ff14]/80'
                : 'bg-orange-500 text-black hover:bg-orange-400'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isPending || isConfirming ? <Loader2 size={18} className="animate-spin" /> : <ArrowDownUp size={18} />}
            {mode === 'buy' ? 'BUY' : 'SELL'} {tokenSymbol}
          </button>
        )}
      </div>
    </div>
  );
}
