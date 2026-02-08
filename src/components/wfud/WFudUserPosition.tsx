'use client';

import { useState } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, type Address } from 'viem';
import { Wallet, Gift, Loader2 } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { WFUD_ADDRESS, WFUD_ABI } from '@/config/wfudAbi';
import { formatTokens } from '@/lib/utils';

interface PendingReward {
  token: Address;
  amount: bigint;
  symbol: string;
  decimals: number;
}

interface WFudUserPositionProps {
  userBalance: bigint;
  userPercent: number;
  pendingRewards: PendingReward[];
  isLoading: boolean;
}

function formatRewardAmount(amount: bigint, decimals: number): string {
  const val = Number(formatUnits(amount, decimals));
  if (val >= 1_000_000) return `${(val / 1_000_000).toFixed(2)}M`;
  if (val >= 1_000) return `${(val / 1_000).toFixed(2)}K`;
  if (val >= 1) return val.toFixed(4);
  if (val > 0) return val.toFixed(6);
  return '0';
}

export function WFudUserPosition({
  userBalance,
  userPercent,
  pendingRewards,
  isLoading,
}: WFudUserPositionProps) {
  const { isConnected } = useAccount();
  const [claimingToken, setClaimingToken] = useState<Address | null>(null);
  const [claimingAll, setClaimingAll] = useState(false);

  const { writeContract, data: txHash, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash: txHash });

  const handleClaimSingle = (tokenAddress: Address) => {
    setClaimingToken(tokenAddress);
    setClaimingAll(false);
    writeContract({
      address: WFUD_ADDRESS,
      abi: WFUD_ABI,
      functionName: 'claimYield',
      args: [tokenAddress],
    });
  };

  const handleClaimAll = () => {
    setClaimingAll(true);
    setClaimingToken(null);
    writeContract({
      address: WFUD_ADDRESS,
      abi: WFUD_ABI,
      functionName: 'claimAllYield',
    });
  };

  const hasAnyPending = pendingRewards.some((r) => r.amount > 0n);
  const isBusy = isPending || isConfirming;

  if (!isConnected) {
    return (
      <Card variant="default">
        <CardHeader>
          <CardTitle>Your Position</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center gap-3 py-6">
            <Wallet size={32} className="text-text-muted" />
            <p className="text-text-muted text-sm font-mono text-center">
              Connect wallet to view your wFUD position and pending yields
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card variant="glow">
      <CardHeader>
        <CardTitle>Your Position</CardTitle>
        {isSuccess && (
          <span className="text-[10px] font-mono text-fud-green">Claimed!</span>
        )}
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="space-y-3">
            <div className="h-8 bg-dark-tertiary rounded animate-pulse" />
            <div className="h-20 bg-dark-tertiary rounded animate-pulse" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Balance */}
            <div className="flex items-center justify-between p-3 bg-dark-tertiary rounded-lg border border-border-primary">
              <div>
                <p className="text-[10px] font-mono text-text-muted uppercase">wFUD Balance</p>
                <p className="text-lg font-mono font-bold text-fud-green">
                  {formatTokens(userBalance)}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-mono text-text-muted uppercase">% of Supply</p>
                <p className="text-lg font-mono font-bold text-fud-purple">
                  {userPercent.toFixed(2)}%
                </p>
              </div>
            </div>

            {/* Pending Rewards */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-[10px] font-mono text-text-muted uppercase tracking-wider flex items-center gap-1">
                  <Gift size={12} /> Pending Yields
                </p>
                {hasAnyPending && (
                  <Button
                    size="sm"
                    onClick={handleClaimAll}
                    loading={claimingAll && isBusy}
                    disabled={isBusy}
                  >
                    Claim All
                  </Button>
                )}
              </div>

              <div className="space-y-2">
                {pendingRewards.length === 0 ? (
                  <p className="text-text-muted text-xs font-mono py-2">No yield tokens found</p>
                ) : (
                  pendingRewards.map((reward) => (
                    <div
                      key={reward.token}
                      className="flex items-center justify-between p-2.5 bg-dark-secondary rounded-lg border border-border-primary"
                    >
                      <div>
                        <span className="text-xs font-mono font-bold text-text-primary">
                          {reward.symbol}
                        </span>
                        <span className="text-xs font-mono text-text-muted ml-2">
                          {formatRewardAmount(reward.amount, reward.decimals)}
                        </span>
                      </div>
                      {reward.amount > 0n && (
                        <button
                          onClick={() => handleClaimSingle(reward.token)}
                          disabled={isBusy}
                          className="px-2.5 py-1 text-[10px] font-mono font-bold text-fud-green bg-fud-green/10 border border-fud-green/30 rounded hover:bg-fud-green/20 transition-colors disabled:opacity-50"
                        >
                          {claimingToken === reward.token && isBusy ? (
                            <Loader2 size={10} className="animate-spin" />
                          ) : (
                            'Claim'
                          )}
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
