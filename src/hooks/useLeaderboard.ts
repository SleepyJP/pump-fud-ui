'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  getAirdropLeaderboard,
  getReferralLeaderboard,
  getROILeaderboard,
  getUserStats,
  getUserRank,
  getTodayPool,
  type AirdropLeaderboardEntry,
  type ReferralLeaderboardEntry,
  type ROILeaderboardEntry,
  type UserStats,
  type UserRank,
  type PoolInfo,
} from '@/lib/indexerApi';

interface UseLeaderboardResult {
  airdropLeaderboard: AirdropLeaderboardEntry[];
  referralLeaderboard: ReferralLeaderboardEntry[];
  roiLeaderboard: ROILeaderboardEntry[];
  userStats: UserStats | null;
  userRank: UserRank | null;
  poolInfo: PoolInfo | null;
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useLeaderboard(userAddress?: string): UseLeaderboardResult {
  const [airdropLeaderboard, setAirdropLeaderboard] = useState<AirdropLeaderboardEntry[]>([]);
  const [referralLeaderboard, setReferralLeaderboard] = useState<ReferralLeaderboardEntry[]>([]);
  const [roiLeaderboard, setRoiLeaderboard] = useState<ROILeaderboardEntry[]>([]);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [userRank, setUserRank] = useState<UserRank | null>(null);
  const [poolInfo, setPoolInfo] = useState<PoolInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      // Fetch all leaderboards in parallel
      const [airdropRes, referralRes, roiRes, poolRes] = await Promise.allSettled([
        getAirdropLeaderboard(100),
        getReferralLeaderboard(100),
        getROILeaderboard(100),
        getTodayPool(),
      ]);

      if (airdropRes.status === 'fulfilled') {
        setAirdropLeaderboard(airdropRes.value.leaderboard);
      }

      if (referralRes.status === 'fulfilled') {
        setReferralLeaderboard(referralRes.value.leaderboard);
      }

      if (roiRes.status === 'fulfilled') {
        setRoiLeaderboard(roiRes.value.leaderboard);
      }

      if (poolRes.status === 'fulfilled') {
        setPoolInfo(poolRes.value);
      }

      // Fetch user-specific data if address provided
      if (userAddress) {
        const [statsRes, rankRes] = await Promise.allSettled([
          getUserStats(userAddress),
          getUserRank(userAddress),
        ]);

        if (statsRes.status === 'fulfilled') {
          setUserStats(statsRes.value);
        }

        if (rankRes.status === 'fulfilled') {
          setUserRank(rankRes.value);
        }
      }
    } catch (err) {
      console.error('Leaderboard fetch error:', err);
      setError('Failed to load leaderboard data');
    } finally {
      setIsLoading(false);
    }
  }, [userAddress]);

  useEffect(() => {
    fetchData();

    // Refresh every 30 seconds
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    airdropLeaderboard,
    referralLeaderboard,
    roiLeaderboard,
    userStats,
    userRank,
    poolInfo,
    isLoading,
    error,
    refetch: fetchData,
  };
}

// Hook for registering referrals from URL params
export function useReferralCode() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [registered, setRegistered] = useState(false);

  useEffect(() => {
    // Check URL for referral code
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const refCode = params.get('ref');
      if (refCode) {
        // Store in localStorage for later use when user connects wallet
        localStorage.setItem('pendingReferralCode', refCode);
      }
    }
  }, []);

  const registerReferral = useCallback(async (userAddress: string) => {
    const refCode = localStorage.getItem('pendingReferralCode');
    if (!refCode || isRegistering || registered) return;

    setIsRegistering(true);
    try {
      const { registerReferral } = await import('@/lib/indexerApi');
      await registerReferral(refCode, userAddress);
      localStorage.removeItem('pendingReferralCode');
      setRegistered(true);
    } catch (err) {
      console.error('Failed to register referral:', err);
    } finally {
      setIsRegistering(false);
    }
  }, [isRegistering, registered]);

  return { registerReferral, isRegistering, registered };
}
