// PUMP.FUD Indexer API Client

const API_BASE = process.env.NEXT_PUBLIC_INDEXER_API || 'http://localhost:3001';

// ═══════════════════════════════════════
// TYPES
// ═══════════════════════════════════════

export interface AirdropLeaderboardEntry {
  address: string;
  totalFeesPaid: string;
  userPoolContribution: string;
  swapCount: number;
  rank: number;
}

export interface ReferralLeaderboardEntry {
  address: string;
  referralCode: string;
  referralCount: number;
  totalEarnings: string;
  rank: number;
}

export interface ROILeaderboardEntry {
  address: string;
  totalInvested: string;
  realizedPnL: string;
  tokenCount: number;
  roiPercent: number;
  rank: number;
}

export interface UserStats {
  address: string;
  totalBuys: string;
  totalSells: string;
  totalFeesPaid: string;
  userPoolContribution: string;
  swapCount: number;
  lastSwapTime: number | null;
  totalAirdropsReceived: string;
  referralCode: string | null;
  referredBy: string | null;
  referralCount: number;
  referralEarnings: string;
}

export interface UserRank {
  rank: number;
  userPoolContribution: string;
  totalPoolContribution: string;
  estimatedShare: number;
}

export interface PoolInfo {
  date: string;
  totalUserFees: string;
  totalTreasuryFees: string;
  distributed: boolean;
  totalPoolContribution: string;
}

export interface FeeStructure {
  treasury: string;
  fees: {
    buy: { totalBps: number; userPoolBps: number; treasuryBps: number };
    sell: { totalBps: number; userPoolBps: number; treasuryBps: number };
    graduation: { treasuryFeeBps: number };
    referral: { bps: number };
  };
  graduationLiquidity: {
    pulsexV2Percent: number;
    paisleyV2Percent: number;
    lpBurned: boolean;
  };
}

export interface TokenPosition {
  tokenAddress: string;
  tokenName: string | null;
  tokenSymbol: string | null;
  totalBought: string;
  totalSold: string;
  costBasis: string;
  realizedPnL: string;
  roiPercent: number;
}

export interface CreatorTokens {
  launched: Array<{
    tokenId: string;
    tokenAddress: string;
    name: string;
    symbol: string;
    blockNumber: number;
    timestamp: number;
  }>;
  graduated: Array<{
    tokenId: string;
    tokenAddress: string;
    name: string;
    symbol: string;
    liquidityAmount: string;
    treasuryFee: string;
    timestamp: number;
  }>;
  stats: {
    totalLaunched: number;
    totalGraduated: number;
    successRate: number;
  };
}

// ═══════════════════════════════════════
// API CALLS
// ═══════════════════════════════════════

async function fetchApi<T>(endpoint: string): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`);
  if (!res.ok) {
    throw new Error(`API error: ${res.status} ${res.statusText}`);
  }
  return res.json();
}

async function postApi<T>(endpoint: string, data: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ error: 'Unknown error' }));
    throw new Error(error.error || `API error: ${res.status}`);
  }
  return res.json();
}

// Leaderboards
export async function getAirdropLeaderboard(limit = 100): Promise<{
  leaderboard: AirdropLeaderboardEntry[];
  pool: PoolInfo;
  totalPoolContribution: string;
  feeStructure: { buyTotalBps: number; buyUserBps: number; buyTreasuryBps: number; sellTotalBps: number; sellUserBps: number; sellTreasuryBps: number };
}> {
  return fetchApi(`/api/leaderboard/airdrop?limit=${limit}`);
}

export async function getReferralLeaderboard(limit = 100): Promise<{
  leaderboard: ReferralLeaderboardEntry[];
  referralBps: number;
}> {
  return fetchApi(`/api/leaderboard/referral?limit=${limit}`);
}

export async function getROILeaderboard(limit = 100): Promise<{
  leaderboard: ROILeaderboardEntry[];
}> {
  return fetchApi(`/api/leaderboard/roi?limit=${limit}`);
}

// User
export async function getUserStats(address: string): Promise<UserStats> {
  return fetchApi(`/api/user/${address}`);
}

export async function getUserRank(address: string): Promise<UserRank> {
  return fetchApi(`/api/user/${address}/rank`);
}

export async function getUserPositions(address: string): Promise<{ positions: TokenPosition[] }> {
  return fetchApi(`/api/user/${address}/positions`);
}

// Referrals
export async function registerReferral(referralCode: string, referredAddress: string): Promise<{
  success: boolean;
  referrer: string;
  referred: string;
}> {
  return postApi('/api/referral/register', { referralCode, referredAddress });
}

export async function getReferralByCode(code: string): Promise<{
  code: string;
  referrerAddress: string;
  referralCount: number;
}> {
  return fetchApi(`/api/referral/code/${code}`);
}

// Tokens
export async function getCreatorTokens(address: string): Promise<CreatorTokens> {
  return fetchApi(`/api/tokens/creator/${address}`);
}

export async function getTokenStats(address: string): Promise<{
  token: {
    tokenId: string;
    tokenAddress: string;
    creator: string;
    name: string;
    symbol: string;
    launchBlock: number;
    launchTimestamp: number;
  };
  stats: {
    totalSwaps: number;
    buyCount: number;
    sellCount: number;
    totalBuyVolume: string;
    totalSellVolume: string;
    totalFees: string;
    uniqueTraders: number;
  };
  graduated: {
    liquidityAmount: string;
    treasuryFee: string;
    timestamp: number;
  } | null;
}> {
  return fetchApi(`/api/token/${address}`);
}

// Pool
export async function getTodayPool(): Promise<PoolInfo> {
  return fetchApi('/api/pool/today');
}

export async function getFeeStructure(): Promise<FeeStructure> {
  return fetchApi('/api/fees');
}

// Health
export async function checkApiHealth(): Promise<{ status: string; timestamp: number }> {
  return fetchApi('/health');
}
