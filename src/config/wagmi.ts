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

export const CONTRACTS = {
  FACTORY: process.env.NEXT_PUBLIC_FACTORY_ADDRESS as `0x${string}` | undefined,
  BONDING_CURVE: process.env.NEXT_PUBLIC_BONDING_CURVE_ADDRESS as `0x${string}` | undefined,
  FEE_DISTRIBUTOR: process.env.NEXT_PUBLIC_FEE_DISTRIBUTOR_ADDRESS as `0x${string}` | undefined,
  LEADERBOARD: process.env.NEXT_PUBLIC_LEADERBOARD_ADDRESS as `0x${string}` | undefined,
  SUPERCHAT: process.env.NEXT_PUBLIC_SUPERCHAT_ADDRESS as `0x${string}` | undefined,
  TREASURY: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const,
  PULSEX_ROUTER: '0x165C3410fC91EF562C50559f7d2289fEbed552d9' as const,
  WPLS: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as const,
} as const;

export const CONSTANTS = {
  LAUNCH_FEE: BigInt('100000000000000000000000'), // 100,000 PLS
  GRADUATION_THRESHOLD: BigInt('69000000000000000000000'), // 69,000 PLS
  BUY_FEE_BPS: 100,
  SELL_FEE_BPS: 110,
  CHAT_THRESHOLD_BPS: 100,
  BOARD_THRESHOLD_BPS: 50,
  SUPERCHAT_TIERS: [0, 100, 500, 1000, 5000, 10000] as const,
} as const;
