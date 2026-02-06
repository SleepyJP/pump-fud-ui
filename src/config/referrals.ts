import { parseAbi } from 'viem';

// ═══════════════════════════════════════════════════════════════════
// PUMP.FUD REFERRAL SYSTEM CONFIG
// ═══════════════════════════════════════════════════════════════════

export const REFERRAL_CONFIG = {
  // Default code - SleepyJ's referral (HARDCODED - use this in all marketing/bots/telegram)
  // Marketing link: https://pump-fud-ui.vercel.app/?ref=31B8F9A8
  DEFAULT_CODE: '31B8F9A8',

  // Treasury receives referral fees when no code provided
  TREASURY: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const,

  // DEPLOYED ON PULSECHAIN 369
  CONTRACT: (process.env.NEXT_PUBLIC_REFERRALS_ADDRESS || '0xcaDa87A9d1025563C976909c13013C9DDc471A17') as `0x${string}`,

  // LocalStorage key for storing referral code
  STORAGE_KEY: 'pumpfud_ref_code',

  // URL parameter name
  URL_PARAM: 'ref',

  // Referral takes 25% of user portion (0.5% * 25% = 0.125%)
  REFERRAL_OF_USER_BPS: 2500, // 25%
  REFERRAL_EFFECTIVE_BPS: 12.5, // 0.125%
} as const;

export const REFERRAL_ABI = parseAbi([
  // Register your own referral code
  'function registerCode(string code) external',

  // Set your referrer (one-time, permanent)
  'function setReferrer(string code) external',

  // Get referrer for user (returns treasury if none)
  'function getReferrer(address user) external view returns (address)',

  // Check if code is available
  'function isCodeAvailable(string code) external view returns (bool)',

  // Get wallet for a code
  'function getAddressForCode(string code) external view returns (address)',

  // Check if user has referrer set
  'function hasReferrer(address user) external view returns (bool)',

  // Get referrer stats
  'function getReferrerStats(address referrer) external view returns (uint256 count, uint256 earnings)',

  // Treasury address
  'function treasury() external view returns (address)',

  // Events
  'event CodeRegistered(address indexed referrer, string code, bytes32 codeHash)',
  'event ReferralSet(address indexed user, address indexed referrer, string code)',
  'event ReferralPaid(address indexed referrer, address indexed from, uint256 amount)',
]);

/**
 * Get referral code from URL or localStorage
 */
export function getReferralCode(): string {
  // Check URL first
  if (typeof window !== 'undefined') {
    const urlParams = new URLSearchParams(window.location.search);
    const urlCode = urlParams.get(REFERRAL_CONFIG.URL_PARAM);

    if (urlCode) {
      // Store in localStorage for persistence
      localStorage.setItem(REFERRAL_CONFIG.STORAGE_KEY, urlCode.toUpperCase());
      return urlCode.toUpperCase();
    }

    // Fall back to localStorage
    const storedCode = localStorage.getItem(REFERRAL_CONFIG.STORAGE_KEY);
    if (storedCode) {
      return storedCode;
    }
  }

  // Default
  return REFERRAL_CONFIG.DEFAULT_CODE;
}

/**
 * Clear stored referral code
 */
export function clearReferralCode(): void {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(REFERRAL_CONFIG.STORAGE_KEY);
  }
}

/**
 * Generate a referral link
 */
export function generateReferralLink(code: string): string {
  const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'https://pump.fud';
  return `${baseUrl}/?${REFERRAL_CONFIG.URL_PARAM}=${code}`;
}

/**
 * Validate referral code format
 */
export function isValidCodeFormat(code: string): boolean {
  if (code.length < 3 || code.length > 20) return false;
  return /^[a-zA-Z0-9]+$/.test(code);
}
