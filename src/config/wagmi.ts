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
// Hardcoded for reliability (env vars can fail at build time)
export const CONTRACTS = {
  FACTORY: '0x7e65383639d8418E826a78a2f5C784cd4Bdb92D7' as const,
  BONDING_CURVE: '0x8d487ab0c5a622d7bafc643bec09506ae3c5710b' as const,
  FEE_DISTRIBUTOR: '0x212fd8BD0Ca548aDc661749cAA93f6a9403eD31F' as const,
  LEADERBOARD: '0xf851d6ffdb197332a5e6e7a8f6905d796cfbedbf' as const,
  SUPERCHAT: '0xc47aa11816abbdd93203de5db5d1215b820f1e6a' as const,
  REFERRALS: '0xcaDa87A9d1025563C976909c13013C9DDc471A17' as const,
  TREASURY: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const,
  PULSEX_ROUTER: '0x165C3410fC91EF562C50559f7d2289fEbed552d9' as const,
  WPLS: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as const,
} as const;

export const CONSTANTS = {
  LAUNCH_FEE: BigInt('100000000000000000000000'), // 100,000 PLS
  GRADUATION_THRESHOLD: BigInt('50000000000000000000000000'), // 50,000,000 PLS (LIVE ON-CHAIN)
  BUY_FEE_BPS: 100,
  SELL_FEE_BPS: 110,
  CHAT_THRESHOLD_BPS: 100,  // 1% for live chat
  BOARD_THRESHOLD_BPS: 50,  // 0.5% for message board
  SUPERCHAT_TIERS: [0, 100, 500, 1000, 5000, 10000] as const,
} as const;
