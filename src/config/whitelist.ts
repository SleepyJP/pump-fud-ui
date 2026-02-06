/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * THE pHuD FARM - WHITELISTED ADDRESSES
 * These addresses are exempt from ALL fees/restrictions:
 * - Launch fees (token creation is FREE)
 * - Trading fees (buy/sell on bonding curve)
 * - Platform fees
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const WHITELISTED_ADDRESSES = [
  '0x31b8f9a85FA9B9258B5b5F1875DBD863999dCA76',  // Admin 1
  '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B',  // Treasury (Primary)
  '0xa0d254a39Ea8645FFc79A9353c32f02504c5F3e7',  // Admin 2
  '0x8F8dc70b1733f8293542F0C816f5a0Ff46E54393',  // Admin 3
  '0x1c3e87796d0D242209C4Cf0354DAbBceb95F2317',  // Admin 4
  '0xdBDA1341890EFCc30734EEC5d5a462a69a29b0B7',  // Dev 1
  '0x438052132c9984632532fdBf92bA6C9AA9654a39',  // Admin 5
  '0xbD52490bd81D562378f28521872AB20C1ea8d98C',  // Admin 6
  '0x61D8adC8A10AE0E06B52fE78f0d0264eEdE74799',  // Admin 7
] as const;

export const WHITELISTED_SET = new Set(
  WHITELISTED_ADDRESSES.map(a => a.toLowerCase())
);

export function isWhitelisted(address: string): boolean {
  return WHITELISTED_SET.has(address.toLowerCase());
}

// Typed version
export type WhitelistedAddress = typeof WHITELISTED_ADDRESSES[number];

// Treasury for fee routing
export const TREASURY = '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const;
