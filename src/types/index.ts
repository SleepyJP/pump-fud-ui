export interface Token {
  address: `0x${string}`;
  name: string;
  symbol: string;
  imageUri: string;
  description: string;
  creator: `0x${string}`;
  totalSupply: bigint;
  plsReserve: bigint;
  graduated: boolean;
  currentPrice: bigint;
  graduationProgress: number;
}

export interface SuperChatMessage {
  sender: `0x${string}`;
  token: `0x${string}`;
  message: string;
  tier: number;
  amount: bigint;
  timestamp: bigint;
  isMessageBoard: boolean;
}

export interface VolumeEntry {
  user: `0x${string}`;
  volume: bigint;
}

export interface ReferralEntry {
  user: `0x${string}`;
  referredVolume: bigint;
  referralCount: bigint;
}

export interface TradeEvent {
  type: 'buy' | 'sell';
  user: `0x${string}`;
  amount: bigint;
  tokens: bigint;
  timestamp: number;
  txHash: `0x${string}`;
}

export interface PanelLayout {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
  static?: boolean;
}

export type PanelType = 'chart' | 'trade' | 'chat' | 'board' | 'holders' | 'info';

export type PanelSkin =
  | 'default'
  | 'neon'
  | 'matrix'
  | 'cyber'
  | 'minimal'
  | 'gradient'
  | 'glass'
  | 'retro';

export const PANEL_SKINS: { id: PanelSkin; name: string; preview: string }[] = [
  { id: 'default', name: 'Default', preview: 'border-fud-green/30' },
  { id: 'neon', name: 'Neon Glow', preview: 'border-fud-green shadow-[0_0_20px_rgba(214,255,224,0.5)]' },
  { id: 'matrix', name: 'Matrix', preview: 'border-green-500 bg-green-950/20' },
  { id: 'cyber', name: 'Cyberpunk', preview: 'border-fuchsia-500 bg-fuchsia-950/10' },
  { id: 'minimal', name: 'Minimal', preview: 'border-zinc-700 bg-zinc-900/50' },
  { id: 'gradient', name: 'Gradient', preview: 'border-transparent bg-gradient-to-br from-fud-green/20 to-fud-purple/20' },
  { id: 'glass', name: 'Glass', preview: 'border-white/10 bg-white/5 backdrop-blur-xl' },
  { id: 'retro', name: 'Retro', preview: 'border-amber-500 bg-amber-950/10' },
];

export const getSkinClasses = (skin: PanelSkin): string => {
  const skinMap: Record<PanelSkin, string> = {
    default: 'border-fud-green/30 bg-dark-secondary/80',
    neon: 'border-fud-green shadow-[0_0_20px_rgba(214,255,224,0.4)] bg-dark-secondary/90',
    matrix: 'border-green-400 bg-green-950/30 shadow-[inset_0_0_30px_rgba(0,255,0,0.1)]',
    cyber: 'border-fuchsia-500 bg-gradient-to-br from-fuchsia-950/20 to-cyan-950/20 shadow-[0_0_15px_rgba(217,70,239,0.3)]',
    minimal: 'border-zinc-700 bg-zinc-900/60',
    gradient: 'border-transparent bg-gradient-to-br from-fud-green/10 via-dark-secondary to-fud-purple/10',
    glass: 'border-white/20 bg-white/5 backdrop-blur-xl shadow-xl',
    retro: 'border-amber-500 bg-gradient-to-b from-amber-950/20 to-orange-950/10 shadow-[0_0_10px_rgba(245,158,11,0.2)]',
  };
  return skinMap[skin] || skinMap.default;
};
