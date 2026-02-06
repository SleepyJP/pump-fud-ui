'use client';

import React, { useState } from 'react';
import { Gift, Wallet, Clock, ArrowDownToLine, Loader2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { type Address, formatUnits } from 'viem';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Rewards Claim Panel
// Displays pending rewards and allows holders to claim
// ═══════════════════════════════════════════════════════════════════════════

interface RewardsClaimPanelProps {
  tokenAddress: Address;
  pendingRewards: bigint;
  totalClaimed: bigint;
  rewardTokenSymbol: string;
  rewardTokenDecimals?: number;
  canClaim: boolean;
  graduated: boolean;
  onClaimSuccess?: () => void;
}

// ABI for claim function
const CLAIM_ABI = [
  {
    inputs: [],
    name: 'claimRewards',
    outputs: [{ type: 'uint256', name: 'amount' }],
    stateMutability: 'nonpayable',
    type: 'function',
  },
] as const;

export function RewardsClaimPanel({
  tokenAddress,
  pendingRewards,
  totalClaimed,
  rewardTokenSymbol,
  rewardTokenDecimals = 18,
  canClaim,
  graduated,
  onClaimSuccess,
}: RewardsClaimPanelProps) {
  const { isConnected, address: userAddress } = useAccount();
  const [claimHash, setClaimHash] = useState<`0x${string}` | null>(null);

  // Write contract hook for claiming
  const { writeContract, isPending: isClaimPending } = useWriteContract();

  // Wait for transaction
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: claimHash || undefined,
  });

  // Handle claim
  const handleClaim = async () => {
    if (!canClaim || pendingRewards === 0n) return;

    try {
      writeContract(
        {
          address: tokenAddress,
          abi: CLAIM_ABI,
          functionName: 'claimRewards',
        },
        {
          onSuccess: (hash) => {
            setClaimHash(hash);
            onClaimSuccess?.();
          },
        }
      );
    } catch (error) {
      console.error('Claim failed:', error);
    }
  };

  // Format values
  const formatReward = (value: bigint) => {
    const num = Number(formatUnits(value, rewardTokenDecimals));
    if (num === 0) return '0';
    if (num < 0.0001) return '< 0.0001';
    return num.toLocaleString(undefined, { maximumFractionDigits: 4 });
  };

  // Estimate USD value (placeholder - would need price feed)
  const estimateUSD = (value: bigint) => {
    // TODO: Connect to price feed
    return null;
  };

  const isLoading = isClaimPending || isConfirming;
  const hasPendingRewards = pendingRewards > 0n;

  // Not connected state
  if (!isConnected) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black border border-gray-800 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-gray-800 flex items-center justify-center">
            <Gift size={16} className="text-gray-500" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-gray-400">YOUR REWARDS</h3>
            <p className="text-[10px] text-gray-600">Connect wallet to view</p>
          </div>
        </div>
        <div className="p-4 bg-gray-900/50 rounded-lg border border-dashed border-gray-700 text-center">
          <Wallet size={24} className="mx-auto mb-2 text-gray-600" />
          <p className="text-xs text-gray-500">Connect your wallet to view rewards</p>
        </div>
      </div>
    );
  }

  // Not graduated state
  if (!graduated) {
    return (
      <div className="bg-gradient-to-br from-gray-900 to-black border border-orange-500/20 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 flex items-center justify-center">
            <Clock size={16} className="text-orange-400" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-orange-400">REWARDS PENDING</h3>
            <p className="text-[10px] text-gray-500">Activate after graduation</p>
          </div>
        </div>
        <div className="p-4 bg-orange-500/5 rounded-lg border border-orange-500/20">
          <div className="flex items-center gap-2 text-orange-300">
            <AlertCircle size={14} />
            <span className="text-xs font-mono">
              Holder rewards activate once the token graduates from bonding curve
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black border border-[#d6ffe0]/20 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#d6ffe0]/20 flex items-center justify-center">
            <Gift size={16} className="text-[#d6ffe0]" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-[#d6ffe0]">YOUR REWARDS</h3>
            <p className="text-[10px] text-gray-500">
              {userAddress?.slice(0, 6)}...{userAddress?.slice(-4)}
            </p>
          </div>
        </div>
      </div>

      {/* Pending Rewards */}
      <div className="p-4 bg-black/50 rounded-lg border border-[#d6ffe0]/30 mb-3">
        <div className="text-[10px] text-gray-500 uppercase mb-1">Pending Rewards</div>
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold text-[#d6ffe0] font-mono">
            {formatReward(pendingRewards)}
          </span>
          <span className="text-sm text-gray-400">{rewardTokenSymbol}</span>
        </div>
        {estimateUSD(pendingRewards) && (
          <div className="text-xs text-gray-500 mt-1">
            ≈ ${estimateUSD(pendingRewards)}
          </div>
        )}
      </div>

      {/* Claim Button */}
      <button
        onClick={handleClaim}
        disabled={!canClaim || !hasPendingRewards || isLoading}
        className={`w-full py-3 px-4 rounded-lg font-mono text-sm font-bold flex items-center justify-center gap-2 transition-all ${
          hasPendingRewards && canClaim && !isLoading
            ? 'bg-[#d6ffe0] text-black hover:bg-[#b8f5c5] shadow-[0_0_20px_rgba(214,255,224,0.3)]'
            : 'bg-gray-800 text-gray-500 cursor-not-allowed'
        }`}
      >
        {isLoading ? (
          <>
            <Loader2 size={16} className="animate-spin" />
            {isConfirming ? 'CONFIRMING...' : 'CLAIMING...'}
          </>
        ) : isConfirmed ? (
          <>
            <CheckCircle2 size={16} />
            CLAIMED!
          </>
        ) : hasPendingRewards ? (
          <>
            <ArrowDownToLine size={16} />
            CLAIM REWARDS
          </>
        ) : (
          <>
            <Gift size={16} />
            NO REWARDS YET
          </>
        )}
      </button>

      {/* Total Claimed */}
      <div className="mt-4 pt-3 border-t border-gray-800">
        <div className="flex items-center justify-between text-xs">
          <span className="text-gray-500">Total Claimed</span>
          <span className="font-mono text-gray-300">
            {formatReward(totalClaimed)} {rewardTokenSymbol}
          </span>
        </div>
      </div>

      {/* Transaction Link */}
      {claimHash && isConfirmed && (
        <div className="mt-3 p-2 bg-[#d6ffe0]/10 rounded-lg border border-[#d6ffe0]/20">
          <a
            href={`https://scan.pulsechain.com/tx/${claimHash}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-[#d6ffe0] font-mono hover:underline flex items-center gap-1"
          >
            View transaction ↗
          </a>
        </div>
      )}

      {/* Info Text */}
      <p className="mt-3 text-[10px] text-gray-600 text-center">
        Rewards are distributed from trading fees. Hold tokens to earn.
      </p>
    </div>
  );
}

export default RewardsClaimPanel;
