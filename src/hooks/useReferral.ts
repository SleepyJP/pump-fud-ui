'use client';

import { useEffect, useState, useCallback } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import {
  REFERRAL_CONFIG,
  REFERRAL_ABI,
  getReferralCode,
  generateReferralLink,
  isValidCodeFormat,
} from '@/config/referrals';

interface ReferralState {
  // Current referral code (from URL or storage)
  code: string;
  // Whether user has a referrer set on-chain
  hasReferrer: boolean;
  // The user's referrer address
  referrerAddress: string | null;
  // Loading states
  isLoading: boolean;
  isSettingReferrer: boolean;
  isRegisteringCode: boolean;
}

interface UseReferralReturn extends ReferralState {
  // Set referrer on-chain (one-time)
  setReferrer: () => Promise<void>;
  // Register your own referral code
  registerCode: (code: string) => Promise<void>;
  // Generate referral link for a code
  getShareLink: (code?: string) => string;
  // Check if a code is available
  checkCodeAvailable: (code: string) => Promise<boolean>;
  // User's own referral code (if registered)
  myCode: string | null;
  // Referral stats
  stats: { count: number; earnings: bigint } | null;
  // Transaction states
  txHash: `0x${string}` | undefined;
  isConfirming: boolean;
  isConfirmed: boolean;
}

export function useReferral(): UseReferralReturn {
  const { address, isConnected } = useAccount();
  const [code, setCode] = useState<string>(REFERRAL_CONFIG.DEFAULT_CODE);
  const [myCode, setMyCode] = useState<string | null>(null);

  // Get referral code from URL/storage on mount
  useEffect(() => {
    setCode(getReferralCode());
  }, []);

  // Check if user has referrer set
  const { data: hasReferrer, isLoading: isLoadingHasReferrer } = useReadContract({
    address: REFERRAL_CONFIG.CONTRACT,
    abi: REFERRAL_ABI,
    functionName: 'hasReferrer',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && REFERRAL_CONFIG.CONTRACT !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Get user's referrer address
  const { data: referrerAddress } = useReadContract({
    address: REFERRAL_CONFIG.CONTRACT,
    abi: REFERRAL_ABI,
    functionName: 'getReferrer',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && REFERRAL_CONFIG.CONTRACT !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Get referrer stats (if user has registered a code)
  const { data: stats } = useReadContract({
    address: REFERRAL_CONFIG.CONTRACT,
    abi: REFERRAL_ABI,
    functionName: 'getReferrerStats',
    args: address ? [address] : undefined,
    query: {
      enabled: isConnected && !!address && REFERRAL_CONFIG.CONTRACT !== '0x0000000000000000000000000000000000000000',
    },
  });

  // Write contract hooks
  const {
    writeContract,
    data: txHash,
    isPending: isWritePending,
  } = useWriteContract();

  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  // Set referrer on-chain
  const setReferrer = useCallback(async () => {
    if (!isConnected || hasReferrer) return;

    writeContract({
      address: REFERRAL_CONFIG.CONTRACT,
      abi: REFERRAL_ABI,
      functionName: 'setReferrer',
      args: [code],
    });
  }, [isConnected, hasReferrer, code, writeContract]);

  // Register referral code
  const registerCode = useCallback(async (newCode: string) => {
    if (!isConnected || !isValidCodeFormat(newCode)) return;

    writeContract({
      address: REFERRAL_CONFIG.CONTRACT,
      abi: REFERRAL_ABI,
      functionName: 'registerCode',
      args: [newCode],
    });
  }, [isConnected, writeContract]);

  // Check if code is available
  const checkCodeAvailable = useCallback(async (checkCode: string): Promise<boolean> => {
    if (!isValidCodeFormat(checkCode)) return false;
    // This would need to be called via publicClient
    return true;
  }, []);

  // Generate share link
  const getShareLink = useCallback((shareCode?: string) => {
    return generateReferralLink(shareCode || myCode || REFERRAL_CONFIG.DEFAULT_CODE);
  }, [myCode]);

  return {
    code,
    hasReferrer: !!hasReferrer,
    referrerAddress: referrerAddress as string | null,
    isLoading: isLoadingHasReferrer,
    isSettingReferrer: isWritePending,
    isRegisteringCode: isWritePending,
    setReferrer,
    registerCode,
    getShareLink,
    checkCodeAvailable,
    myCode,
    stats: stats ? { count: Number(stats[0]), earnings: stats[1] } : null,
    txHash,
    isConfirming,
    isConfirmed,
  };
}

/**
 * Hook to auto-set referrer on first action
 * SILENT: No UI, auto-registers with PUMPFUD (treasury) unless URL has ?ref=CODE
 * Use this in buy/create token flows
 */
export function useAutoSetReferrer() {
  const { hasReferrer, setReferrer, isSettingReferrer, code } = useReferral();
  const { isConnected } = useAccount();
  const [hasAttempted, setHasAttempted] = useState(false);

  // Auto-register silently on mount if connected and no referrer
  useEffect(() => {
    if (isConnected && !hasReferrer && !isSettingReferrer && !hasAttempted) {
      setHasAttempted(true);
      setReferrer().catch(() => {
        // Silent fail - treasury still gets fees
      });
    }
  }, [isConnected, hasReferrer, isSettingReferrer, hasAttempted, setReferrer]);

  const ensureReferrer = useCallback(async () => {
    if (isConnected && !hasReferrer && !isSettingReferrer) {
      await setReferrer();
    }
  }, [isConnected, hasReferrer, isSettingReferrer, setReferrer]);

  return {
    ensureReferrer,
    needsReferrer: isConnected && !hasReferrer,
    currentCode: code,
  };
}
