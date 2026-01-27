"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initDatabase = initDatabase;
exports.getDb = getDb;
exports.recordSwap = recordSwap;
exports.recordReferral = recordReferral;
exports.getAirdropLeaderboard = getAirdropLeaderboard;
exports.getReferralLeaderboard = getReferralLeaderboard;
exports.getROILeaderboard = getROILeaderboard;
exports.getUserStats = getUserStats;
exports.getTodayAirdropPool = getTodayAirdropPool;
exports.getTotalPoolContribution = getTotalPoolContribution;
exports.getIndexerState = getIndexerState;
exports.setIndexerState = setIndexerState;
exports.getReferrer = getReferrer;
exports.findReferrerByCode = findReferrerByCode;
const sql_js_1 = __importDefault(require("sql.js"));
const path_1 = __importDefault(require("path"));
const fs_1 = __importDefault(require("fs"));
const DB_PATH = process.env.DB_PATH || './data/pump-fud.db';
// Ensure data directory exists
const dataDir = path_1.default.dirname(DB_PATH);
if (!fs_1.default.existsSync(dataDir)) {
    fs_1.default.mkdirSync(dataDir, { recursive: true });
}
let sqlDb;
// Wrapper to mimic better-sqlite3 API
class DatabaseWrapper {
    prepare(sql) {
        return {
            run: (...params) => {
                sqlDb.run(sql, params);
                saveDatabase();
            },
            get: (...params) => {
                const stmt = sqlDb.prepare(sql);
                if (params.length)
                    stmt.bind(params);
                if (stmt.step()) {
                    const row = stmt.getAsObject();
                    stmt.free();
                    return row;
                }
                stmt.free();
                return undefined;
            },
            all: (...params) => {
                const stmt = sqlDb.prepare(sql);
                if (params.length)
                    stmt.bind(params);
                const rows = [];
                while (stmt.step()) {
                    rows.push(stmt.getAsObject());
                }
                stmt.free();
                return rows;
            },
        };
    }
    run(sql, params) {
        if (params && params.length) {
            sqlDb.run(sql, params);
        }
        else {
            sqlDb.run(sql);
        }
        saveDatabase();
    }
    exec(sql) {
        sqlDb.run(sql);
        saveDatabase();
    }
}
const db = new DatabaseWrapper();
// Save database to file
function saveDatabase() {
    if (sqlDb) {
        const data = sqlDb.export();
        const buffer = Buffer.from(data);
        fs_1.default.writeFileSync(DB_PATH, buffer);
    }
}
// Auto-save every 30 seconds
let saveInterval = null;
// Initialize database
async function initDatabase() {
    const SQL = await (0, sql_js_1.default)();
    // Load existing database if it exists
    if (fs_1.default.existsSync(DB_PATH)) {
        const buffer = fs_1.default.readFileSync(DB_PATH);
        sqlDb = new SQL.Database(buffer);
    }
    else {
        sqlDb = new SQL.Database();
    }
    // Initialize schema
    sqlDb.run(`
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
    sqlDb.run(`
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
    sqlDb.run(`
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
    sqlDb.run(`
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
    sqlDb.run(`
    CREATE TABLE IF NOT EXISTS referrals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      referrer_address TEXT NOT NULL,
      referred_address TEXT NOT NULL,
      timestamp INTEGER NOT NULL,
      created_at INTEGER DEFAULT (strftime('%s', 'now')),
      UNIQUE(referred_address)
    )
  `);
    sqlDb.run(`
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
    sqlDb.run(`
    CREATE TABLE IF NOT EXISTS indexer_state (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at INTEGER DEFAULT (strftime('%s', 'now'))
    )
  `);
    sqlDb.run(`
    CREATE TABLE IF NOT EXISTS launched_tokens (
      token_id INTEGER NOT NULL,
      token_address TEXT PRIMARY KEY,
      creator TEXT NOT NULL,
      name TEXT,
      symbol TEXT,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
    sqlDb.run(`
    CREATE TABLE IF NOT EXISTS graduated_tokens (
      token_id INTEGER NOT NULL,
      token_address TEXT PRIMARY KEY,
      liquidity_amount TEXT NOT NULL,
      treasury_fee TEXT NOT NULL,
      block_number INTEGER NOT NULL,
      timestamp INTEGER NOT NULL
    )
  `);
    // Create indices
    sqlDb.run(`CREATE INDEX IF NOT EXISTS idx_swaps_trader ON swaps(trader_address)`);
    sqlDb.run(`CREATE INDEX IF NOT EXISTS idx_swaps_token ON swaps(token_address)`);
    sqlDb.run(`CREATE INDEX IF NOT EXISTS idx_swaps_block ON swaps(block_number)`);
    sqlDb.run(`CREATE INDEX IF NOT EXISTS idx_user_stats_pool ON user_stats(user_pool_contribution)`);
    sqlDb.run(`CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_address)`);
    // Save and start auto-save
    saveDatabase();
    if (!saveInterval) {
        saveInterval = setInterval(saveDatabase, 30000);
    }
    // Save on exit
    process.on('exit', saveDatabase);
    process.on('SIGINT', () => { saveDatabase(); process.exit(); });
    process.on('SIGTERM', () => { saveDatabase(); process.exit(); });
    console.log('✅ Database initialized');
}
// Helper functions
function getDb() {
    return db;
}
// Record a swap
function recordSwap(swap) {
    db.prepare(`
    INSERT OR IGNORE INTO swaps
    (tx_hash, block_number, timestamp, token_address, trader_address, is_buy,
     amount_in, amount_out, fee_amount, user_fee, treasury_fee, referrer_address, referrer_fee)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(swap.txHash, swap.blockNumber, swap.timestamp, swap.tokenAddress.toLowerCase(), swap.traderAddress.toLowerCase(), swap.isBuy ? 1 : 0, swap.amountIn.toString(), swap.amountOut.toString(), swap.feeAmount.toString(), swap.userFee.toString(), swap.treasuryFee.toString(), swap.referrerAddress?.toLowerCase() || null, swap.referrerFee?.toString() || null);
    // Update user stats
    updateUserStats(swap.traderAddress, swap.isBuy, swap.feeAmount, swap.userFee);
    // Update today's airdrop pool
    updateAirdropPool(swap.userFee, swap.treasuryFee);
    // Update referrer if applicable
    if (swap.referrerAddress && swap.referrerFee) {
        updateReferrerEarnings(swap.referrerAddress, swap.referrerFee);
    }
    // Update token position for ROI tracking
    updateTokenPosition(swap.traderAddress, swap.tokenAddress, swap.isBuy, swap.amountIn, swap.amountOut);
}
// Generate referral code from address
function generateReferralCode(address) {
    return address.slice(2, 10).toUpperCase();
}
// Update user aggregated stats
function updateUserStats(address, isBuy, totalFee, userPoolFee) {
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
    }
    else {
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
function updateAirdropPool(userFee, treasuryFee) {
    const today = new Date().toISOString().split('T')[0];
    db.prepare(`INSERT OR IGNORE INTO airdrop_pool (date) VALUES (?)`).run(today);
    db.prepare(`
    UPDATE airdrop_pool
    SET total_user_fees = CAST((CAST(total_user_fees AS INTEGER) + ?) AS TEXT),
        total_treasury_fees = CAST((CAST(total_treasury_fees AS INTEGER) + ?) AS TEXT)
    WHERE date = ?
  `).run(userFee.toString(), treasuryFee.toString(), today);
}
// Update referrer earnings
function updateReferrerEarnings(referrerAddress, amount) {
    const addr = referrerAddress.toLowerCase();
    db.prepare(`
    UPDATE user_stats
    SET referral_earnings = CAST((CAST(referral_earnings AS INTEGER) + ?) AS TEXT),
        updated_at = strftime('%s', 'now')
    WHERE address = ?
  `).run(amount.toString(), addr);
}
// Update token position for ROI
function updateTokenPosition(userAddress, tokenAddress, isBuy, amountIn, amountOut) {
    const user = userAddress.toLowerCase();
    const token = tokenAddress.toLowerCase();
    db.prepare(`
    INSERT OR IGNORE INTO user_token_positions (user_address, token_address)
    VALUES (?, ?)
  `).run(user, token);
    if (isBuy) {
        db.prepare(`
      UPDATE user_token_positions
      SET total_bought = CAST((CAST(total_bought AS INTEGER) + ?) AS TEXT),
          cost_basis = CAST((CAST(cost_basis AS INTEGER) + ?) AS TEXT),
          updated_at = strftime('%s', 'now')
      WHERE user_address = ? AND token_address = ?
    `).run(amountOut.toString(), amountIn.toString(), user, token);
    }
    else {
        db.prepare(`
      UPDATE user_token_positions
      SET total_sold = CAST((CAST(total_sold AS INTEGER) + ?) AS TEXT),
          realized_pnl = CAST((CAST(realized_pnl AS INTEGER) + ?) AS TEXT),
          updated_at = strftime('%s', 'now')
      WHERE user_address = ? AND token_address = ?
    `).run(amountIn.toString(), amountOut.toString(), user, token);
    }
}
// Record referral
function recordReferral(referrerAddress, referredAddress) {
    const referrer = referrerAddress.toLowerCase();
    const referred = referredAddress.toLowerCase();
    try {
        db.prepare(`
      INSERT OR IGNORE INTO referrals (referrer_address, referred_address, timestamp)
      VALUES (?, ?, strftime('%s', 'now'))
    `).run(referrer, referred);
        db.prepare(`UPDATE user_stats SET referred_by = ? WHERE address = ?`).run(referrer, referred);
        db.prepare(`UPDATE user_stats SET referral_count = referral_count + 1 WHERE address = ?`).run(referrer);
        return true;
    }
    catch (e) {
        return false;
    }
}
// Get airdrop leaderboard
function getAirdropLeaderboard(limit = 100) {
    const rows = db.prepare(`
    SELECT address, total_fees_paid, user_pool_contribution, swap_count
    FROM user_stats
    WHERE CAST(user_pool_contribution AS INTEGER) > 0
    ORDER BY CAST(user_pool_contribution AS INTEGER) DESC
    LIMIT ?
  `).all(limit);
    return rows.map((row, index) => ({
        address: row.address,
        totalFeesPaid: row.total_fees_paid,
        userPoolContribution: row.user_pool_contribution,
        swapCount: row.swap_count,
        rank: index + 1,
    }));
}
// Get referral leaderboard
function getReferralLeaderboard(limit = 100) {
    const rows = db.prepare(`
    SELECT address, referral_code, referral_count, referral_earnings
    FROM user_stats
    WHERE referral_count > 0
    ORDER BY CAST(referral_earnings AS INTEGER) DESC
    LIMIT ?
  `).all(limit);
    return rows.map((row, index) => ({
        address: row.address,
        referralCode: row.referral_code,
        referralCount: row.referral_count,
        totalEarnings: row.referral_earnings,
        rank: index + 1,
    }));
}
// Get ROI leaderboard
function getROILeaderboard(limit = 100) {
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
  `).all(limit);
    return rows.map((row, index) => {
        const invested = BigInt(row.total_invested || 0);
        const pnl = BigInt(row.realized_pnl || 0);
        const roiPercent = invested > 0n
            ? Number((pnl * 10000n) / invested) / 100
            : 0;
        return {
            address: row.user_address,
            totalInvested: (row.total_invested || '0').toString(),
            realizedPnL: (row.realized_pnl || '0').toString(),
            tokenCount: row.token_count,
            roiPercent,
            rank: index + 1,
        };
    });
}
// Get user stats
function getUserStats(address) {
    const addr = address.toLowerCase();
    const row = db.prepare(`SELECT * FROM user_stats WHERE address = ?`).get(addr);
    if (!row)
        return null;
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
function getTodayAirdropPool() {
    const today = new Date().toISOString().split('T')[0];
    const row = db.prepare(`SELECT * FROM airdrop_pool WHERE date = ?`).get(today);
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
// Get total pool contribution
function getTotalPoolContribution() {
    const row = db.prepare(`
    SELECT SUM(CAST(user_pool_contribution AS INTEGER)) as total
    FROM user_stats
  `).get();
    return BigInt(row?.total || 0);
}
// Get indexer state
function getIndexerState(key) {
    const row = db.prepare(`SELECT value FROM indexer_state WHERE key = ?`).get(key);
    return row?.value || null;
}
// Set indexer state
function setIndexerState(key, value) {
    db.prepare(`
    INSERT OR REPLACE INTO indexer_state (key, value, updated_at)
    VALUES (?, ?, strftime('%s', 'now'))
  `).run(key, value);
}
// Get referrer for an address
function getReferrer(address) {
    const addr = address.toLowerCase();
    const row = db.prepare(`SELECT referred_by FROM user_stats WHERE address = ?`).get(addr);
    return row?.referred_by || null;
}
// Find referrer by code
function findReferrerByCode(code) {
    const row = db.prepare(`SELECT address FROM user_stats WHERE referral_code = ?`).get(code.toUpperCase());
    return row?.address || null;
}
exports.default = db;
//# sourceMappingURL=database.js.map