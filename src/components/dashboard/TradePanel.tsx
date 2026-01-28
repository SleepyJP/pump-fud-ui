'use client';

import { useState, useMemo, useEffect } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, erc20Abi, Address } from 'viem';
import { Button } from '@/components/ui/Button';
import { TOKEN_ABI, BONDING_CURVE_ABI } from '@/config/abis';
import { CONTRACTS } from '@/config/wagmi';
import { formatPLS } from '@/lib/utils';
import { ArrowDownUp, Flame, Zap, AlertTriangle, CheckCircle, Loader2 } from 'lucide-react';

interface TradePanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  currentPrice?: bigint;
}

type TradeMode = 'buy' | 'sell' | 'burn';

export function TradePanel({ tokenAddress, tokenSymbol = 'TOKEN', currentPrice }: TradePanelProps) {
  const [mode, setMode] = useState<TradeMode>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('5');

  const { address, isConnected } = useAccount();
  const { data: plsBalance } = useBalance({ address });

  const BURN_ADDRESS: Address = '0x000000000000000000000000000000000000dEaD';

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
    query: {
      enabled: !!tokenAddress && mode === 'buy' && parsedAmount > BigInt(0) && totalSupply !== undefined,
    },
  });

  const { data: sellQuote } = useReadContract({
    address: CONTRACTS.BONDING_CURVE as `0x${string}`,
    abi: BONDING_CURVE_ABI,
    functionName: 'calculateSaleReturn',
    args: [totalSupply || BigInt(0), parsedAmount],
    query: {
      enabled: !!tokenAddress && mode === 'sell' && parsedAmount > BigInt(0) && totalSupply !== undefined,
    },
  });

  const slippageBps = useMemo(() => {
    const pct = parseFloat(slippage) || 5;
    return BigInt(Math.floor(pct * 100));
  }, [slippage]);

  const minBuyTokens = useMemo(() => {
    if (!buyQuote) return BigInt(0);
    return (buyQuote * (BigInt(10000) - slippageBps)) / BigInt(10000);
  }, [buyQuote, slippageBps]);

  const minSellPls = useMemo(() => {
    if (!sellQuote) return BigInt(0);
    return (sellQuote * (BigInt(10000) - slippageBps)) / BigInt(10000);
  }, [sellQuote, slippageBps]);

  const { writeContract, data: hash, isPending, reset } = useWriteContract();
  const { isLoading: isConfirming, isSuccess, isError } = useWaitForTransactionReceipt({ hash });

  // Reset form on success
  useEffect(() => {
    if (isSuccess) {
      setAmount('');
      setTimeout(() => reset(), 3000);
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
    } else if (mode === 'sell') {
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'sell',
        args: [parsedAmount, minSellPls],
      });
    } else if (mode === 'burn') {
      writeContract({
        address: tokenAddress,
        abi: erc20Abi,
        functionName: 'transfer',
        args: [BURN_ADDRESS, parsedAmount],
      });
    }
  };

  const setMaxAmount = () => {
    if (mode === 'buy' && plsBalance) {
      const maxPls = plsBalance.value - parseEther('10'); // Keep 10 PLS for gas
      if (maxPls > BigInt(0)) {
        setAmount(formatEther(maxPls));
      }
    } else if ((mode === 'sell' || mode === 'burn') && tokenBalance) {
      setAmount(formatEther(tokenBalance));
    }
  };

  const getQuoteDisplay = () => {
    if (mode === 'buy' && buyQuote) {
      return `≈ ${formatPLS(buyQuote)} ${tokenSymbol}`;
    }
    if (mode === 'sell' && sellQuote) {
      return `≈ ${formatPLS(sellQuote)} PLS`;
    }
    if (mode === 'burn') {
      return `🔥 ${amount || '0'} ${tokenSymbol} burned forever`;
    }
    return null;
  };

  const isButtonDisabled = !isConnected || !tokenAddress || parsedAmount <= BigInt(0) || isPending || isConfirming;

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-dark-primary to-dark-secondary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-fud-green/20">
        <div className="flex items-center gap-2">
          <ArrowDownUp size={18} className="text-fud-green" />
          <span className="font-display text-sm text-fud-green">SWAP</span>
        </div>
        <span className="text-[10px] font-mono text-text-muted">${tokenSymbol}</span>
      </div>

      {/* Mode Tabs */}
      <div className="flex border-b border-fud-green/10">
        {(['buy', 'sell', 'burn'] as TradeMode[]).map((m) => (
          <button
            key={m}
            onClick={() => { setMode(m); setAmount(''); }}
            className={`flex-1 py-3 text-xs font-mono uppercase tracking-wider transition-all ${
              mode === m
                ? m === 'buy'
                  ? 'bg-fud-green/20 text-fud-green border-b-2 border-fud-green'
                  : m === 'sell'
                    ? 'bg-orange-500/20 text-orange-400 border-b-2 border-orange-400'
                    : 'bg-red-500/20 text-red-400 border-b-2 border-red-400'
                : 'text-text-muted hover:text-text-primary hover:bg-dark-tertiary/50'
            }`}
          >
            {m === 'burn' && <Flame size={12} className="inline mr-1" />}
            {m}
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 p-4 space-y-4 overflow-auto">
        {/* Balance Display */}
        <div className="flex justify-between text-xs font-mono">
          <span className="text-text-muted">Available Balance:</span>
          <span className="text-text-primary">
            {mode === 'buy'
              ? `${plsBalance ? formatPLS(plsBalance.value) : '0'} PLS`
              : `${tokenBalance ? formatPLS(tokenBalance) : '0'} ${tokenSymbol}`
            }
          </span>
        </div>

        {/* Input */}
        <div className="relative">
          <input
            type="text"
            value={amount}
            onChange={(e) => {
              const val = e.target.value;
              if (/^[0-9]*\.?[0-9]*$/.test(val)) {
                setAmount(val);
              }
            }}
            placeholder="0.0"
            className="w-full px-4 py-4 bg-dark-tertiary border-2 border-fud-green/20 rounded-xl font-mono text-2xl text-text-primary placeholder:text-text-muted/30 focus:outline-none focus:border-fud-green/50 transition-colors"
          />
          <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
            <button
              onClick={setMaxAmount}
              className="px-2 py-1 text-[10px] font-mono bg-fud-green/20 text-fud-green rounded hover:bg-fud-green/30 transition-colors"
            >
              MAX
            </button>
            <span className="text-sm font-mono text-text-muted">
              {mode === 'buy' ? 'PLS' : tokenSymbol}
            </span>
          </div>
        </div>

        {/* Quote */}
        {parsedAmount > BigInt(0) && (
          <div className="px-4 py-3 bg-dark-tertiary/50 rounded-lg border border-fud-green/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-mono text-text-muted">You receive:</span>
              <span className={`text-sm font-mono font-bold ${
                mode === 'buy' ? 'text-fud-green' : mode === 'sell' ? 'text-orange-400' : 'text-red-400'
              }`}>
                {getQuoteDisplay()}
              </span>
            </div>
          </div>
        )}

        {/* Slippage */}
        {mode !== 'burn' && (
          <div className="flex items-center justify-between">
            <span className="text-xs font-mono text-text-muted">Slippage Tolerance:</span>
            <div className="flex items-center gap-1">
              {['1', '3', '5', '10'].map((s) => (
                <button
                  key={s}
                  onClick={() => setSlippage(s)}
                  className={`px-2 py-1 text-[10px] font-mono rounded transition-all ${
                    slippage === s
                      ? 'bg-fud-green text-black'
                      : 'bg-dark-tertiary text-text-muted hover:text-fud-green'
                  }`}
                >
                  {s}%
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Transaction Status */}
        {(isPending || isConfirming || isSuccess || isError) && (
          <div className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-mono ${
            isSuccess
              ? 'bg-fud-green/20 text-fud-green'
              : isError
                ? 'bg-red-500/20 text-red-400'
                : 'bg-yellow-500/20 text-yellow-400'
          }`}>
            {(isPending || isConfirming) && <Loader2 size={14} className="animate-spin" />}
            {isSuccess && <CheckCircle size={14} />}
            {isError && <AlertTriangle size={14} />}
            <span>
              {isPending ? 'Confirm in wallet...' : isConfirming ? 'Processing...' : isSuccess ? 'Transaction successful!' : 'Transaction failed'}
            </span>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="p-4 border-t border-fud-green/10">
        {!isConnected ? (
          <Button variant="secondary" className="w-full" disabled>
            Connect Wallet
          </Button>
        ) : !tokenAddress ? (
          <Button variant="secondary" className="w-full" disabled>
            Select Token
          </Button>
        ) : (
          <Button
            onClick={handleTrade}
            disabled={isButtonDisabled}
            loading={isPending || isConfirming}
            className={`w-full text-lg py-4 ${
              mode === 'buy'
                ? ''
                : mode === 'sell'
                  ? 'bg-orange-500 border-orange-500 hover:bg-orange-400'
                  : 'bg-red-500 border-red-500 hover:bg-red-400'
            }`}
          >
            {mode === 'buy' && <Zap size={18} className="mr-2" />}
            {mode === 'sell' && <ArrowDownUp size={18} className="mr-2" />}
            {mode === 'burn' && <Flame size={18} className="mr-2" />}
            {mode === 'buy' ? 'BUY' : mode === 'sell' ? 'SELL' : 'BURN'} {tokenSymbol}
          </Button>
        )}
      </div>
    </div>
  );
}
