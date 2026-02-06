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
// V6 Factory - Clone Pattern (EIP-1167) - deployed 2026-02-02
// 50M PLS graduation threshold, 100K PLS launch fee (FREE for whitelisted)
// FeeCollector: Auto-airdrop system (100K treasury / 1M user thresholds)
export const CONTRACTS = {
  FACTORY: '0x6317446972E2AcA317d7a1ef27D1412AFFcF8E27' as const,
  BONDING_CURVE: '0x1e667ABC26bb0Da9B37Fd4Eb78Bb6695Ed43f0cd' as const,
  FEE_COLLECTOR: '0x83bE1e3D997A4acd9fc155752170C829Adca4A46' as const,
  LEADERBOARD: '0xB2a121ff515331992A29ef6CEf3ffdF090587415' as const,
  SUPERCHAT: '0x1139aD1e7088Ef50FC657EBF83E6A444DDee6b5F' as const,
  TREASURY: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B' as const,
  PULSEX_V2_ROUTER: '0x165C3410fC91EF562C50559f7d2289fEbed552d9' as const,
  PAISLEY_SMART_ROUTER: '0xAa4DF5c4D35Bb658cdcac78dB09D3Aa1393862b0' as const,
  WPLS: '0xA1077a294dDE1B09bB078844df40758a5D0f9a27' as const,
} as const;

// Official Platform Tokens
export const PLATFORM_TOKENS = {
  // wFUD - Wrapped FUD - Official Meme Rewarder Token
  // Rewards holders with ~6 tokens including wFUD reflections
  WFUD: '0xa59A460B9bd6Db7b167e7082Df3C9D87EeBc9825' as const,
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
