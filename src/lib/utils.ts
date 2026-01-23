import { type ClassValue, clsx } from 'clsx';

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs);
}

export function formatPLS(value: bigint, decimals = 2): string {
  const formatted = Number(value) / 1e18;
  if (formatted >= 1_000_000) {
    return `${(formatted / 1_000_000).toFixed(decimals)}M`;
  }
  if (formatted >= 1_000) {
    return `${(formatted / 1_000).toFixed(decimals)}K`;
  }
  return formatted.toFixed(decimals);
}

export function formatTokens(value: bigint, decimals = 2): string {
  const formatted = Number(value) / 1e18;
  if (formatted >= 1_000_000_000) {
    return `${(formatted / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (formatted >= 1_000_000) {
    return `${(formatted / 1_000_000).toFixed(decimals)}M`;
  }
  if (formatted >= 1_000) {
    return `${(formatted / 1_000).toFixed(decimals)}K`;
  }
  return formatted.toFixed(decimals);
}

export function formatAddress(address: string): string {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

export function formatTimestamp(timestamp: number | bigint): string {
  const date = new Date(Number(timestamp) * 1000);
  return date.toLocaleString();
}

export function formatTimeAgo(timestamp: number | bigint): string {
  const seconds = Math.floor(Date.now() / 1000 - Number(timestamp));

  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return `${Math.floor(seconds / 86400)}d ago`;
}

export function getTierColor(tier: number): string {
  const colors: Record<number, string> = {
    1: '#00FF00',
    2: '#00CCFF',
    3: '#FF00FF',
    4: '#FFD700',
    5: '#FF0000',
  };
  return colors[tier] || '#FFFFFF';
}

export function getTierName(tier: number): string {
  const names: Record<number, string> = {
    1: 'Tier 1',
    2: 'Tier 2',
    3: 'Tier 3',
    4: 'Tier 4',
    5: 'LEGENDARY',
  };
  return names[tier] || 'Unknown';
}
