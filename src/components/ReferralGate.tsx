'use client';

import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { REFERRAL_CONFIG, isValidCodeFormat } from '@/config/referrals';
import { isWhitelisted } from '@/config/whitelist';

const GATE_STORAGE_KEY = 'pumpfud_gate_unlocked';

interface ReferralGateProps {
  children: React.ReactNode;
}

export function ReferralGate({ children }: ReferralGateProps) {
  const [isUnlocked, setIsUnlocked] = useState<boolean | null>(null);
  const [referralCode, setReferralCode] = useState('');
  const [error, setError] = useState('');
  const { address, isConnected } = useAccount();

  // Check if already unlocked on mount
  useEffect(() => {
    // Bypass gate for share page - always accessible
    if (window.location.pathname === '/share') {
      setIsUnlocked(true);
      return;
    }

    // Check URL for ref code first
    const urlParams = new URLSearchParams(window.location.search);
    const urlRef = urlParams.get('ref');

    if (urlRef && isValidCodeFormat(urlRef)) {
      // AUTO-UNLOCK: If they came with a valid ref code in URL, let them in
      setReferralCode(urlRef.toUpperCase());
      localStorage.setItem(GATE_STORAGE_KEY, 'true');
      localStorage.setItem(REFERRAL_CONFIG.STORAGE_KEY, urlRef.toUpperCase());
      setIsUnlocked(true);
      return;
    }

    // Check if already unlocked
    const unlocked = localStorage.getItem(GATE_STORAGE_KEY);
    if (unlocked === 'true') {
      setIsUnlocked(true);
      return;
    }

    // Default code
    setReferralCode(REFERRAL_CONFIG.DEFAULT_CODE);
    setIsUnlocked(false);
  }, []);

  // Admin wallet bypass - if connected wallet is whitelisted, auto-unlock
  useEffect(() => {
    if (isConnected && address && isWhitelisted(address)) {
      localStorage.setItem(GATE_STORAGE_KEY, 'true');
      localStorage.setItem(REFERRAL_CONFIG.STORAGE_KEY, REFERRAL_CONFIG.DEFAULT_CODE);
      setIsUnlocked(true);
    }
  }, [isConnected, address]);

  const handleEnter = useCallback(() => {
    const code = referralCode.trim().toUpperCase();

    if (!code) {
      setError('Please enter a referral code');
      return;
    }

    if (!isValidCodeFormat(code)) {
      setError('Invalid code format. Use 3-20 alphanumeric characters.');
      return;
    }

    // Store unlock state and referral code
    localStorage.setItem(GATE_STORAGE_KEY, 'true');
    localStorage.setItem(REFERRAL_CONFIG.STORAGE_KEY, code);
    setIsUnlocked(true);
  }, [referralCode]);

  const handleKeyDown = useCallback((e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleEnter();
    }
  }, [handleEnter]);

  // Loading state
  if (isUnlocked === null) {
    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center">
        <div className="animate-pulse text-accent-green text-xl">Loading...</div>
      </div>
    );
  }

  // Already unlocked - show app
  if (isUnlocked) {
    return <>{children}</>;
  }

  // Gate UI
  return (
    <div className="min-h-screen bg-dark-bg relative overflow-hidden flex flex-col items-center justify-center">
      {/* Background */}
      <div className="absolute inset-0 z-0">
        <Image
          src="/pump-fud-hero.png"
          alt="PUMP.FUD"
          fill
          priority
          className="object-cover object-center opacity-30"
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-dark-bg via-dark-bg/80 to-transparent" />
      </div>

      {/* Gate Content */}
      <div className="relative z-10 w-full max-w-md px-4">
        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-display font-bold text-[#d6ffe0] mb-2">
            PUMP.FUD
          </h1>
          <p className="text-gray-400 text-lg">
            Memecoin Launchpad on PulseChain
          </p>
        </div>

        {/* Gate Card */}
        <div className="bg-[#1a1a2e] border border-[#2a2a4a] rounded-xl p-6 shadow-2xl">
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="text-xl font-semibold text-white mb-2">
                Enter Referral Code
              </h2>
              <p className="text-gray-400 text-sm">
                A referral code is required to access PUMP.FUD
              </p>
            </div>

            <div>
              <input
                type="text"
                value={referralCode}
                onChange={(e) => {
                  setReferralCode(e.target.value.toUpperCase());
                  setError('');
                }}
                onKeyDown={handleKeyDown}
                placeholder="Enter code (e.g., 31B8F9A8)"
                className="w-full bg-[#0d0d1a] border border-[#2a2a4a] rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#d6ffe0] text-center text-lg font-mono tracking-wider"
                maxLength={20}
                autoFocus
              />
              {error && (
                <p className="text-red-500 text-sm mt-2 text-center">{error}</p>
              )}
            </div>

            <button
              onClick={handleEnter}
              type="button"
              className="w-full bg-[#d6ffe0] text-black font-bold py-4 rounded-lg hover:bg-[#c0e8ca] transition-colors text-lg cursor-pointer"
            >
              ENTER PUMP.FUD
            </button>

            <p className="text-gray-500 text-xs text-center">
              No code? The default code is already filled in.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-6 text-gray-600 text-sm">
          <p>Built on PulseChain</p>
        </div>
      </div>
    </div>
  );
}
