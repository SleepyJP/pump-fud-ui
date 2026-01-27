import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const DB_PATH = process.env.DB_PATH || './data/pump-fud.db';

// Ensure data directory exists
const dataDir = path.dirname(DB_PATH);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const db = new Database(DB_PATH);
db.pragma('journal_mode = WAL');

// Initialize schema
export function initDatabase() {
  // Swaps table - tracks every swap
  db.exec(`
    CREATE TABLE IF NOT EXISTS swaps (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tx_hash TEXT UNIQUE NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL,
      token_address TEXT NOT NULL,
      trader_address TEXT NOT NULL,
      is_buy INTEGER NOT NULL,
      amount_in TEXT NOT NULL,
      amount_out TEXT NOT NULL,
      fee_amount TEXT NOT NULL,
      user_fee TEXT NOT NULL,
      treasury_fee TEXT NOT NULL,
      referrer_address TEXT,
      referrer_fee TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // User stats - aggregated per user
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_stats (
      address TEXT PRIMARY KEY,
      total_buys TEXT DEFAULT '0',
      total_sells TEXT DEFAULT '0',
      total_fees_paid TEXT DEFAULT '0',
      user_pool_contribution TEXT DEFAULT '0',
      swap_count INTEGER DEFAULT 0,
      last_swap_time INTEGER,
      total_airdrops_received TEXT DEFAULT '0',
      referral_code TEXT UNIQUE,
      referred_by TEXT,
      referral_count INTEGER DEFAULT 0,
      referral_earnings TEXT DEFAULT '0',
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Airdrop pool - tracks daily accumulation
  db.exec(`
    CREATE TABLE IF NOT EXISTS airdrop_pool (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      date TEXT NOT NULL,
      total_user_fees TEXT DEFAULT '0',
      total_treasury_fees TEXT DEFAULT '0',
      distributed INTEGER DEFAULT 0,
      distribution_tx TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Airdrop distributions - individual payouts
  db.exec(`
    CREATE TABLE IF NOT EXISTS airdrop_distributions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      pool_id INTEGER NOT NULL,
      recipient_address TEXT NOT NULL,
      amount TEXT NOT NULL,
      rank INTEGER NOT NULL,
      tx_hash TEXT,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      FOREIGN KEY (pool_id) REFERENCES airdrop_pool(id)
    )
  `);

  // Referrals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_address TEXT NOT NULL,
      referred_address TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(referred_address)
    )
  `);

  // Token trades for ROI tracking
  db.exec(`
    CREATE TABLE IF NOT EXISTS user_token_positions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_address TEXT NOT NULL,
      token_address TEXT NOT NULL,
      total_bought TEXT DEFAULT '0',
      total_sold TEXT DEFAULT '0',
      cost_basis TEXT DEFAULT '0',
      realized_pnl TEXT DEFAULT '0',
      updated_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(user_address, token_address)
    )
  `);

  // Indexer state
  db.exec(`
    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);

  // Create indices for faster queries
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_swaps_trader ON swaps(trader_address);
    CREATE INDEX IF NOT EXISTS idx_swaps_token ON swaps(token_address);
    CREATE INDEX IF NOT EXISTS idx_swaps_block ON swaps(block_number);
    CREATE INDEX IF NOT EXISTS idx_user_stats_pool ON user_stats(user_pool_contribution);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_address);
  `);

  console.log('✅ Database initialized');
}

// Helper functions
export function getDb() {
  return db;
}

// Record a swap
export function recordSwap(swap: {
  txHash: string;
  blockNumber: number;
  timestamp: number;
  tokenAddress: string;
  traderAddress: string;
  isBuy: boolean;
  amountIn: bigint;
  amountOut: bigint;
  feeAmount: bigint;
  userFee: bigint;
  treasuryFee: bigint;
  referrerAddress?: string;
  referrerFee?: bigint;
}) {
  const stmt = db.prepare(`
    INSERT OR IGNORE INTO swaps
    (tx_hash, block_number, timestamp, token_address, trader_address, is_buy,
     amount_in, amount_out, fee_amount, user_fee, treasury_fee, referrer_address, referrer_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  stmt.run(
    swap.txHash,
    swap.blockNumber,
    swap.timestamp,
    swap.tokenAddress.toLowerCase(),
    swap.traderAddress.toLowerCase(),
    swap.isBuy ? 1 : 0,
    swap.amountIn.toString(),
    swap.amountOut.toString(),
    swap.feeAmount.toString(),
    swap.userFee.toString(),
    swap.treasuryFee.toString(),
    swap.referrerAddress?.toLowerCase() || null,
    swap.referrerFee?.toString() || null
  );

  // Update user stats
  updateUserStats(swap.traderAddress, swap.isBuy, swap.feeAmount, swap.userFee);

  // Update today's airdrop pool
  updateAirdropPool(swap.userFee, swap.treasuryFee);

  // Update referrer if applicable
  if (swap.referrerAddress && swap.referrerFee) {
    updateReferrerEarnings(swap.referrerAddress, swap.referrerFee);
  }

  // Update token position for ROI tracking
  updateTokenPosition(
    swap.traderAddress,
    swap.tokenAddress,
    swap.isBuy,
    swap.amountIn,
    swap.amountOut
  );
}

// Update user aggregated stats
function updateUserStats(
  address: string,
  isBuy: boolean,
  totalFee: bigint,
  userPoolFee: bigint
) {
  const addr = address.toLowerCase();

  // Ensure user exists
  db.prepare(`
    INSERT OR IGNORE INTO user_stats (address, referral_code)
    VALUES (?, ?)
  `).run(addr, generateReferralCode(addr));

  if (isBuy) {
    db.prepare(`
      UPDATE user_stats
      SET total_buys = CAST((CAST(total_buys AS INTEGER) + ?) AS TEXT),
          total_fees_paid = CAST((CAST(total_fees_paid AS INTEGER) + ?) AS TEXT),
          user_pool_contribution = CAST((CAST(user_pool_contribution AS INTEGER) + ?) AS TEXT),
          swap_count = swap_count + 1,
          last_swap_time = strftime('%s', 'now'),
          updated_at = strftime('%s', 'now')
      WHERE address = ?
    `).run(totalFee.toString(), totalFee.toString(), userPoolFee.toString(), addr);
  } else {
    db.prepare(`
      UPDATE user_stats
      SET total_sells = CAST((CAST(total_sells AS INTEGER) + ?) AS TEXT),
          total_fees_paid = CAST((CAST(total_fees_paid AS INTEGER) + ?) AS TEXT),
          user_pool_contribution = CAST((CAST(user_pool_contribution AS INTEGER) + ?) AS TEXT),
          swap_count = swap_count + 1,
          last_swap_time = strftime('%s', 'now'),
          updated_at = strftime('%s', 'now')
      WHERE address = ?
    `).run(totalFee.toString(), totalFee.toString(), userPoolFee.toString(), addr);
  }
}

// Update airdrop pool for today
function updateAirdropPool(userFee: bigint, treasuryFee: bigint) {
  const today = new Date().toISOString().split('T')[0];

  // Ensure today's pool exists
  db.prepare(`
    INSERT OR IGNORE INTO airdrop_pool (date) VALUES (?)
  `).run(today);

  db.prepare(`
    UPDATE airdrop_pool
    SET total_user_fees = CAST((CAST(total_user_fees AS INTEGER) + ?) AS TEXT),
        total_treasury_fees = CAST((CAST(total_treasury_fees AS INTEGER) + ?) AS TEXT)
    WHERE date = ?
  `).run(userFee.toString(), treasuryFee.toString(), today);
}

// Update referrer earnings
function updateReferrerEarnings(referrerAddress: string, amount: bigint) {
  const addr = referrerAddress.toLowerCase();

  db.prepare(`
    UPDATE user_stats
    SET referral_earnings = CAST((CAST(referral_earnings AS INTEGER) + ?) AS TEXT),
        updated_at = strftime('%s', 'now')
    WHERE address = ?
  `).run(amount.toString(), addr);
}

// Update token position for ROI
function updateTokenPosition(
  userAddress: string,
  tokenAddress: string,
  isBuy: boolean,
  amountIn: bigint,
  amountOut: bigint
) {
  const user = userAddress.toLowerCase();
  const token = tokenAddress.toLowerCase();

  // Ensure position exists
  db.prepare(`
    INSERT OR IGNORE INTO user_token_positions (user_address, token_address)
    VALUES (?, ?)
  `).run(user, token);

  if (isBuy) {
    // Buying tokens: amountIn is PLS, amountOut is tokens
    db.prepare(`
      UPDATE user_token_positions
      SET total_bought = CAST((CAST(total_bought AS INTEGER) + ?) AS TEXT),
          cost_basis = CAST((CAST(cost_basis AS INTEGER) + ?) AS TEXT),
          updated_at = strftime('%s', 'now')
      WHERE user_address = ? AND token_address = ?
    `).run(amountOut.toString(), amountIn.toString(), user, token);
  } else {
    // Selling tokens: amountIn is tokens, amountOut is PLS
    db.prepare(`
      UPDATE user_token_positions
      SET total_sold = CAST((CAST(total_sold AS INTEGER) + ?) AS TEXT),
          realized_pnl = CAST((CAST(realized_pnl AS INTEGER) + ?) AS TEXT),
          updated_at = strftime('%s', 'now')
      WHERE user_address = ? AND token_address = ?
    `).run(amountIn.toString(), amountOut.toString(), user, token);
  }
}

// Generate referral code from address
function generateReferralCode(address: string): string {
  return address.slice(2, 10).toUpperCase();
}

// Record referral
export function recordReferral(referrerAddress: string, referredAddress: string) {
  const referrer = referrerAddress.toLowerCase();
  const referred = referredAddress.toLowerCase();

  try {
    db.prepare(`
      INSERT OR IGNORE INTO referrals (referrer_address, referred_address, timestamp)
      VALUES (?, ?, strftime('%s', 'now'))
    `).run(referrer, referred);

    // Update user's referred_by
    db.prepare(`
      UPDATE user_stats SET referred_by = ? WHERE address = ?
    `).run(referrer, referred);

    // Update referrer's referral count
    db.prepare(`
      UPDATE user_stats SET referral_count = referral_count + 1 WHERE address = ?
    `).run(referrer);

    return true;
  } catch (e) {
    return false;
  }
}

// Get airdrop leaderboard
export function getAirdropLeaderboard(limit = 100): {
  address: string;
  totalFeesPaid: string;
  userPoolContribution: string;
  swapCount: number;
  rank: number;
}[] {
  const rows = db.prepare(`
    SELECT address, total_fees_paid, user_pool_contribution, swap_count
    FROM user_stats
    WHERE CAST(user_pool_contribution AS INTEGER) > 0
    ORDER BY CAST(user_pool_contribution AS INTEGER) DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row, index) => ({
    address: row.address,
    totalFeesPaid: row.total_fees_paid,
    userPoolContribution: row.user_pool_contribution,
    swapCount: row.swap_count,
    rank: index + 1,
  }));
}

// Get referral leaderboard
export function getReferralLeaderboard(limit = 100): {
  address: string;
  referralCode: string;
  referralCount: number;
  totalEarnings: string;
  rank: number;
}[] {
  const rows = db.prepare(`
    SELECT address, referral_code, referral_count, referral_earnings
    FROM user_stats
    WHERE referral_count > 0
    ORDER BY CAST(referral_earnings AS INTEGER) DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row, index) => ({
    address: row.address,
    referralCode: row.referral_code,
    referralCount: row.referral_count,
    totalEarnings: row.referral_earnings,
    rank: index + 1,
  }));
}

// Get ROI leaderboard
export function getROILeaderboard(limit = 100): {
  address: string;
  totalInvested: string;
  realizedPnL: string;
  tokenCount: number;
  roiPercent: number;
  rank: number;
}[] {
  const rows = db.prepare(`
    SELECT
      user_address,
      SUM(CAST(cost_basis AS INTEGER)) as total_invested,
      SUM(CAST(realized_pnl AS INTEGER)) as realized_pnl,
      COUNT(DISTINCT token_address) as token_count
    FROM user_token_positions
    WHERE CAST(cost_basis AS INTEGER) > 0
    GROUP BY user_address
    ORDER BY (SUM(CAST(realized_pnl AS INTEGER)) * 100.0 / NULLIF(SUM(CAST(cost_basis AS INTEGER)), 0)) DESC
    LIMIT ?
  `).all(limit) as any[];

  return rows.map((row, index) => {
    const invested = BigInt(row.total_invested || 0);
    const pnl = BigInt(row.realized_pnl || 0);
    const roiPercent = invested > 0n
      ? Number((pnl * 10000n) / invested) / 100
      : 0;

    return {
      address: row.user_address,
      totalInvested: row.total_invested || '0',
      realizedPnL: row.realized_pnl || '0',
      tokenCount: row.token_count,
      roiPercent,
      rank: index + 1,
    };
  });
}

// Get user stats
export function getUserStats(address: string) {
  const addr = address.toLowerCase();
  const row = db.prepare(`
    SELECT * FROM user_stats WHERE address = ?
  `).get(addr) as any;

  if (!row) return null;

  return {
    address: row.address,
    totalBuys: row.total_buys,
    totalSells: row.total_sells,
    totalFeesPaid: row.total_fees_paid,
    userPoolContribution: row.user_pool_contribution,
    swapCount: row.swap_count,
    lastSwapTime: row.last_swap_time,
    totalAirdropsReceived: row.total_airdrops_received,
    referralCode: row.referral_code,
    referredBy: row.referred_by,
    referralCount: row.referral_count,
    referralEarnings: row.referral_earnings,
  };
}

// Get today's airdrop pool
export function getTodayAirdropPool() {
  const today = new Date().toISOString().split('T')[0];
  const row = db.prepare(`
    SELECT * FROM airdrop_pool WHERE date = ?
  `).get(today) as any;

  if (!row) {
    return {
      date: today,
      totalUserFees: '0',
      totalTreasuryFees: '0',
      distributed: false,
    };
  }

  return {
    date: row.date,
    totalUserFees: row.total_user_fees,
    totalTreasuryFees: row.total_treasury_fees,
    distributed: row.distributed === 1,
  };
}

// Get total pool contribution (for calculating airdrop shares)
export function getTotalPoolContribution(): bigint {
  const row = db.prepare(`
    SELECT SUM(CAST(user_pool_contribution AS INTEGER)) as total
    FROM user_stats
  `).get() as any;

  return BigInt(row?.total || 0);
}

// Get indexer state
export function getIndexerState(key: string): string | null {
  const row = db.prepare(`SELECT value FROM indexer_state WHERE key = ?`).get(key) as any;
  return row?.value || null;
}

// Set indexer state
export function setIndexerState(key: string, value: string) {
  db.prepare(`
    INSERT OR REPLACE INTO indexer_state (key, value, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
  `).run(key, value);
}

// Get referrer for an address
export function getReferrer(address: string): string | null {
  const addr = address.toLowerCase();
  const row = db.prepare(`
    SELECT referred_by FROM user_stats WHERE address = ?
  `).get(addr) as any;
  return row?.referred_by || null;
}

// Find referrer by code
export function findReferrerByCode(code: string): string | null {
  const row = db.prepare(`
    SELECT address FROM user_stats WHERE referral_code = ?
  `).get(code.toUpperCase()) as any;
  return row?.address || null;
}

export default db;
