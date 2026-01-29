import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { http, type Chain } from 'viem';

export const pulsechain: Chain = {
  id: 369,
  name: 'PulseChain',
  nativeCurrency: { name: 'Pulse', symbol: 'PLS', decimals: 18 },
  rpcUrls: {
    default: { http: ['https://rpc.pulsechain.com'] },
  },
  blockExplorers: {
    default: { name: 'PulseScan', url: 'https://scan.pulsechain.com' },
  },
};

export const config = getDefaultConfig({
  appName: 'PUMP.FUD',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'pumpfud-demo',
  chains: [pulsechain],
  transports: {
    [pulsechain.id]: http('https://rpc.pulsechain.com'),
  },
  ssr: true,
});

// PRODUCTION CONTRACT ADDRESSES - PulseChain 369
// V2 Factory with createTokenAndBuy - deployed 2026-01-27
export const CONTRACTS = {
  FACTORY: '0xeEdc047484bF8c3bC0B76b309f2ED7aeB25098Dd' as const,
  BONDING_CURVE: '0x8D8b56Bc9e64db0759dD6adb4734244997464E9d' as const,
  FEE_DISTRIBUTOR: '0x213Fa1E686a23f7ba34DA5005147060C80e1e3Ce' as const,
  LEADERBOARD: '0x431f285C6293a09EAf43D712da3fCc5e323fE40F' as const,
  SUPERCHAT: '0xbc6a2B08FA320606d779f2b00F942a2Ea306c930' as const,
  REFERRALS: '0xcaDa87A9d1025563C976909c13013C9DDc471A17' as const,
  TREASURY: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const,
  PULSEX_ROUTER: '0x165C3410fC91EF562C50559f7d2289fEbed552d9' as const,
  WPLS: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as const,
} as const;

export const CONSTANTS = {
  LAUNCH_FEE: BigInt('100000000000000000000000'), // 100,000 PLS
  GRADUATION_THRESHOLD: BigInt('50000000000000000000000000'), // 50,000,000 PLS (50M)
  BUY_FEE_BPS: 100,
  SELL_FEE_BPS: 110,
  CHAT_THRESHOLD_BPS: 100,  // 1% for live chat
  BOARD_THRESHOLD_BPS: 50,  // 0.5% for message board
  SUPERCHAT_TIERS: [0, 100, 500, 1000, 5000, 10000] as const,
} as const;
