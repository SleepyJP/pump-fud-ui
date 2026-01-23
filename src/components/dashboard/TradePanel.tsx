'use client';

import { useState } from 'react';
import { useAccount, useBalance, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseEther, formatEther, erc20Abi } from 'viem';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TOKEN_ABI } from '@/config/abis';
import { formatPLS } from '@/lib/utils';

interface TradePanelProps {
  tokenAddress?: `0x${string}`;
  tokenSymbol?: string;
  currentPrice?: bigint;
}

export function TradePanel({ tokenAddress, tokenSymbol = 'TOKEN', currentPrice }: TradePanelProps) {
  const [mode, setMode] = useState<'buy' | 'sell'>('buy');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState('5');

  const { address, isConnected } = useAccount();
  const { data: plsBalance } = useBalance({ address });
  const { data: tokenBalanceRaw } = useReadContract({
    address: tokenAddress,
    abi: erc20Abi,
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: { enabled: !!tokenAddress && !!address },
  });
  const tokenBalance = tokenBalanceRaw ? { value: tokenBalanceRaw as bigint } : undefined;

  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const handleTrade = () => {
    if (!tokenAddress || !amount) return;

    if (mode === 'buy') {
      const minTokens = BigInt(0); // Calculate with slippage
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'buy',
        args: [minTokens],
        value: parseEther(amount),
      });
    } else {
      const tokenAmount = parseEther(amount);
      const minPls = BigInt(0); // Calculate with slippage
      writeContract({
        address: tokenAddress,
        abi: TOKEN_ABI,
        functionName: 'sell',
        args: [tokenAmount, minPls],
      });
    }
  };

  const isLoading = isPending || isConfirming;

  return (
    <Card className="h-full flex flex-col" variant="glow">
      <CardHeader>
        <CardTitle>Trade</CardTitle>
        <div className="flex items-center gap-1 p-1 bg-dark-secondary rounded">
          <button
            onClick={() => setMode('buy')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              mode === 'buy'
                ? 'bg-fud-green text-black'
                : 'text-text-muted hover:text-fud-green'
            }`}
          >
            BUY
          </button>
          <button
            onClick={() => setMode('sell')}
            className={`px-3 py-1 text-xs font-mono rounded transition-colors ${
              mode === 'sell'
                ? 'bg-fud-red text-white'
                : 'text-text-muted hover:text-fud-red'
            }`}
          >
            SELL
          </button>
        </div>
      </CardHeader>

      <CardContent className="flex-1 flex flex-col gap-4">
        {!tokenAddress ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl mb-2">💱</div>
              <p className="text-text-muted text-sm font-mono">Select a token to trade</p>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-muted">
                  {mode === 'buy' ? 'PLS Balance' : `${tokenSymbol} Balance`}
                </span>
                <span className="text-text-secondary">
                  {mode === 'buy'
                    ? plsBalance
                      ? formatPLS(plsBalance.value)
                      : '0.00'
                    : tokenBalance
                    ? formatPLS(tokenBalance.value)
                    : '0.00'}
                </span>
              </div>

              <Input
                type="number"
                placeholder="0.0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="text-xl"
              />

              <div className="flex gap-2">
                {['25', '50', '75', '100'].map((pct) => (
                  <button
                    key={pct}
                    onClick={() => {
                      const balance = mode === 'buy' ? plsBalance?.value : tokenBalance?.value;
                      if (balance) {
                        const value = (balance * BigInt(pct)) / BigInt(100);
                        setAmount(formatEther(value));
                      }
                    }}
                    className="flex-1 py-1 text-xs font-mono text-text-muted border border-border-primary rounded hover:border-fud-green/50 hover:text-fud-green transition-colors"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            <div className="p-3 bg-dark-secondary rounded space-y-2">
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-muted">Current Price</span>
                <span className="text-fud-green">
                  {currentPrice ? `${formatPLS(currentPrice, 8)} PLS` : '--'}
                </span>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-muted">Slippage</span>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    className="w-12 px-1 py-0.5 bg-dark-tertiary border border-border-primary rounded text-center text-fud-green"
                  />
                  <span className="text-text-muted">%</span>
                </div>
              </div>
              <div className="flex justify-between text-xs font-mono">
                <span className="text-text-muted">Fee</span>
                <span className="text-fud-orange">{mode === 'buy' ? '1.0%' : '1.1%'}</span>
              </div>
            </div>

            {isSuccess && (
              <div className="p-2 bg-fud-green/10 border border-fud-green/30 rounded text-center">
                <span className="text-fud-green text-xs font-mono">Transaction successful! ✓</span>
              </div>
            )}

            {isConnected ? (
              <Button
                onClick={handleTrade}
                loading={isLoading}
                disabled={!amount || isLoading}
                variant={mode === 'buy' ? 'primary' : 'danger'}
                className="w-full"
              >
                {isLoading
                  ? 'Processing...'
                  : `${mode === 'buy' ? 'BUY' : 'SELL'} ${tokenSymbol}`}
              </Button>
            ) : (
              <Button variant="secondary" className="w-full" disabled>
                Connect Wallet
              </Button>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
