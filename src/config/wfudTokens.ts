// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - wFUD Yield Token Display Config
// Static display metadata for known PulseChain reward tokens
// Falls back to on-chain ERC20 metadata for unknown tokens
// ═══════════════════════════════════════════════════════════════════════════

import { type Address } from 'viem';

export interface YieldTokenDisplay {
  name: string;
  symbol: string;
  color: string;
  bgColor: string;
  borderColor: string;
  icon: string;
}

// Known PulseChain token display config
// Keys are lowercased addresses for case-insensitive lookup
export const KNOWN_TOKENS: Record<string, YieldTokenDisplay> = {
  // WPLS - Wrapped PLS
  '0xa1077a294dde1b09bb078844df40758a5d0f9a27': {
    name: 'Wrapped PLS',
    symbol: 'WPLS',
    color: '#00ff88',
    bgColor: 'rgba(0, 255, 136, 0.1)',
    borderColor: 'rgba(0, 255, 136, 0.3)',
    icon: '💚',
  },
  // HEX
  '0x2b591e99afe9f32eaa6214f7b7629768c40eeb39': {
    name: 'HEX',
    symbol: 'HEX',
    color: '#ff6600',
    bgColor: 'rgba(255, 102, 0, 0.1)',
    borderColor: 'rgba(255, 102, 0, 0.3)',
    icon: '🔶',
  },
  // PLSX - PulseX
  '0x95b303987a60c71504d99aa1b13b4da07b0790ab': {
    name: 'PulseX',
    symbol: 'PLSX',
    color: '#00aaff',
    bgColor: 'rgba(0, 170, 255, 0.1)',
    borderColor: 'rgba(0, 170, 255, 0.3)',
    icon: '🔷',
  },
  // INC - Incentive
  '0x2fa878ab3f87cc1c9737fc071108f904c0b0c95d': {
    name: 'Incentive',
    symbol: 'INC',
    color: '#aa55ff',
    bgColor: 'rgba(170, 85, 255, 0.1)',
    borderColor: 'rgba(170, 85, 255, 0.3)',
    icon: '💎',
  },
  // DAI from Ethereum (bridged)
  '0xefd766ccb38eaf1dfd701853bfce31359239f305': {
    name: 'DAI',
    symbol: 'DAI',
    color: '#f5ac37',
    bgColor: 'rgba(245, 172, 55, 0.1)',
    borderColor: 'rgba(245, 172, 55, 0.3)',
    icon: '🟡',
  },
  // wFUD itself (self-reflection)
  '0xa59a460b9bd6db7b167e7082df3c9d87eebc9825': {
    name: 'wFUD',
    symbol: 'wFUD',
    color: '#d6ffe0',
    bgColor: 'rgba(214, 255, 224, 0.1)',
    borderColor: 'rgba(214, 255, 224, 0.3)',
    icon: '🔄',
  },
  // WETH (bridged)
  '0x02dcdd04e3f455d838cd1249292c58f3b79e3c3c': {
    name: 'Wrapped ETH',
    symbol: 'WETH',
    color: '#627eea',
    bgColor: 'rgba(98, 126, 234, 0.1)',
    borderColor: 'rgba(98, 126, 234, 0.3)',
    icon: '🔷',
  },
  // WBTC (bridged)
  '0xb17d901469b9208b17d916112988a3fed19b5ca1': {
    name: 'Wrapped BTC',
    symbol: 'WBTC',
    color: '#f7931a',
    bgColor: 'rgba(247, 147, 26, 0.1)',
    borderColor: 'rgba(247, 147, 26, 0.3)',
    icon: '🟠',
  },
};

// Default display for unknown tokens
export const DEFAULT_TOKEN_DISPLAY: YieldTokenDisplay = {
  name: 'Unknown Token',
  symbol: '???',
  color: '#9ca3af',
  bgColor: 'rgba(156, 163, 175, 0.1)',
  borderColor: 'rgba(156, 163, 175, 0.3)',
  icon: '🪙',
};

export function getTokenDisplay(address: Address): YieldTokenDisplay {
  return KNOWN_TOKENS[address.toLowerCase()] || DEFAULT_TOKEN_DISPLAY;
}
