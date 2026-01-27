"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const database_1 = require("./database");
const config_1 = require("./config");
require("dotenv/config");
const app = (0, express_1.default)();
const PORT = process.env.PORT || process.env.API_PORT || 3001;
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now() });
});
// ═══════════════════════════════════════
// LEADERBOARD ENDPOINTS
// ═══════════════════════════════════════
// Get airdrop leaderboard
app.get('/api/leaderboard/airdrop', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const leaderboard = (0, database_1.getAirdropLeaderboard)(limit);
        // Get today's pool info
        const pool = (0, database_1.getTodayAirdropPool)();
        const totalContribution = (0, database_1.getTotalPoolContribution)();
        res.json({
            leaderboard,
            pool: {
                date: pool.date,
                totalUserFees: pool.totalUserFees,
                totalTreasuryFees: pool.totalTreasuryFees,
                distributed: pool.distributed,
            },
            totalPoolContribution: totalContribution.toString(),
            feeStructure: {
                buyTotalBps: config_1.FEES.BUY_TOTAL_BPS,
                buyUserBps: config_1.FEES.BUY_USER_BPS,
                buyTreasuryBps: config_1.FEES.BUY_TREASURY_BPS,
                sellTotalBps: config_1.FEES.SELL_TOTAL_BPS,
                sellUserBps: config_1.FEES.SELL_USER_BPS,
                sellTreasuryBps: config_1.FEES.SELL_TREASURY_BPS,
            },
        });
    }
    catch (error) {
        console.error('Error fetching airdrop leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get referral leaderboard
app.get('/api/leaderboard/referral', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const leaderboard = (0, database_1.getReferralLeaderboard)(limit);
        res.json({
            leaderboard,
            referralBps: config_1.FEES.REFERRAL_BPS,
        });
    }
    catch (error) {
        console.error('Error fetching referral leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get ROI leaderboard
app.get('/api/leaderboard/roi', (req, res) => {
    try {
        const limit = Math.min(parseInt(req.query.limit) || 100, 500);
        const leaderboard = (0, database_1.getROILeaderboard)(limit);
        res.json({
            leaderboard,
        });
    }
    catch (error) {
        console.error('Error fetching ROI leaderboard:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ═══════════════════════════════════════
// USER ENDPOINTS
// ═══════════════════════════════════════
// Get user stats
app.get('/api/user/:address', (req, res) => {
    try {
        const { address } = req.params;
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        const stats = (0, database_1.getUserStats)(address);
        if (!stats) {
            return res.json({
                address: address.toLowerCase(),
                totalBuys: '0',
                totalSells: '0',
                totalFeesPaid: '0',
                userPoolContribution: '0',
                swapCount: 0,
                lastSwapTime: null,
                totalAirdropsReceived: '0',
                referralCode: null,
                referredBy: null,
                referralCount: 0,
                referralEarnings: '0',
            });
        }
        res.json(stats);
    }
    catch (error) {
        console.error('Error fetching user stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's rank in airdrop leaderboard
app.get('/api/user/:address/rank', (req, res) => {
    try {
        const { address } = req.params;
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        const db = (0, database_1.getDb)();
        const row = db.prepare(`
      SELECT COUNT(*) + 1 as rank
      FROM user_stats
      WHERE CAST(user_pool_contribution AS INTEGER) > (
        SELECT COALESCE(CAST(user_pool_contribution AS INTEGER), 0)
        FROM user_stats WHERE address = ?
      )
    `).get(address.toLowerCase());
        const stats = (0, database_1.getUserStats)(address);
        const totalPool = (0, database_1.getTotalPoolContribution)();
        res.json({
            rank: row?.rank || 0,
            userPoolContribution: stats?.userPoolContribution || '0',
            totalPoolContribution: totalPool.toString(),
            estimatedShare: totalPool > 0n
                ? Number((BigInt(stats?.userPoolContribution || 0) * 10000n) / totalPool) / 100
                : 0,
        });
    }
    catch (error) {
        console.error('Error fetching user rank:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get user's token positions
app.get('/api/user/:address/positions', (req, res) => {
    try {
        const { address } = req.params;
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        const db = (0, database_1.getDb)();
        const rows = db.prepare(`
      SELECT
        utp.token_address,
        utp.total_bought,
        utp.total_sold,
        utp.cost_basis,
        utp.realized_pnl,
        lt.name as token_name,
        lt.symbol as token_symbol
      FROM user_token_positions utp
      LEFT JOIN launched_tokens lt ON utp.token_address = lt.token_address
      WHERE utp.user_address = ?
      ORDER BY utp.updated_at DESC
    `).all(address.toLowerCase());
        res.json({
            positions: rows.map(row => ({
                tokenAddress: row.token_address,
                tokenName: row.token_name,
                tokenSymbol: row.token_symbol,
                totalBought: row.total_bought,
                totalSold: row.total_sold,
                costBasis: row.cost_basis,
                realizedPnL: row.realized_pnl,
                roiPercent: BigInt(row.cost_basis) > 0n
                    ? Number((BigInt(row.realized_pnl) * 10000n) / BigInt(row.cost_basis)) / 100
                    : 0,
            })),
        });
    }
    catch (error) {
        console.error('Error fetching user positions:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ═══════════════════════════════════════
// REFERRAL ENDPOINTS
// ═══════════════════════════════════════
// Register a referral
app.post('/api/referral/register', (req, res) => {
    try {
        const { referralCode, referredAddress } = req.body;
        if (!referralCode || !referredAddress) {
            return res.status(400).json({ error: 'Missing referralCode or referredAddress' });
        }
        if (!/^0x[a-fA-F0-9]{40}$/.test(referredAddress)) {
            return res.status(400).json({ error: 'Invalid referredAddress' });
        }
        // Find referrer by code
        const referrerAddress = (0, database_1.findReferrerByCode)(referralCode);
        if (!referrerAddress) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }
        // Can't refer yourself
        if (referrerAddress.toLowerCase() === referredAddress.toLowerCase()) {
            return res.status(400).json({ error: 'Cannot refer yourself' });
        }
        // Record the referral
        const success = (0, database_1.recordReferral)(referrerAddress, referredAddress);
        if (!success) {
            return res.status(400).json({ error: 'User already has a referrer' });
        }
        res.json({
            success: true,
            referrer: referrerAddress,
            referred: referredAddress.toLowerCase(),
        });
    }
    catch (error) {
        console.error('Error registering referral:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get referral info by code
app.get('/api/referral/code/:code', (req, res) => {
    try {
        const { code } = req.params;
        const referrerAddress = (0, database_1.findReferrerByCode)(code);
        if (!referrerAddress) {
            return res.status(404).json({ error: 'Invalid referral code' });
        }
        const stats = (0, database_1.getUserStats)(referrerAddress);
        res.json({
            code,
            referrerAddress,
            referralCount: stats?.referralCount || 0,
        });
    }
    catch (error) {
        console.error('Error fetching referral info:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ═══════════════════════════════════════
// TOKEN ENDPOINTS
// ═══════════════════════════════════════
// Get tokens created by address
app.get('/api/tokens/creator/:address', (req, res) => {
    try {
        const { address } = req.params;
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        const db = (0, database_1.getDb)();
        const launched = db.prepare(`
      SELECT * FROM launched_tokens WHERE creator = ?
      ORDER BY timestamp DESC
    `).all(address.toLowerCase());
        const graduated = db.prepare(`
      SELECT gt.*, lt.name, lt.symbol, lt.creator
      FROM graduated_tokens gt
      JOIN launched_tokens lt ON gt.token_address = lt.token_address
      WHERE lt.creator = ?
      ORDER BY gt.timestamp DESC
    `).all(address.toLowerCase());
        res.json({
            launched: launched.map(t => ({
                tokenId: t.token_id,
                tokenAddress: t.token_address,
                name: t.name,
                symbol: t.symbol,
                blockNumber: t.block_number,
                timestamp: t.timestamp,
            })),
            graduated: graduated.map(t => ({
                tokenId: t.token_id,
                tokenAddress: t.token_address,
                name: t.name,
                symbol: t.symbol,
                liquidityAmount: t.liquidity_amount,
                treasuryFee: t.treasury_fee,
                timestamp: t.timestamp,
            })),
            stats: {
                totalLaunched: launched.length,
                totalGraduated: graduated.length,
                successRate: launched.length > 0
                    ? Math.round((graduated.length / launched.length) * 100)
                    : 0,
            },
        });
    }
    catch (error) {
        console.error('Error fetching creator tokens:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get token stats
app.get('/api/token/:address', (req, res) => {
    try {
        const { address } = req.params;
        if (!address || !/^0x[a-fA-F0-9]{40}$/.test(address)) {
            return res.status(400).json({ error: 'Invalid address' });
        }
        const db = (0, database_1.getDb)();
        const tokenAddr = address.toLowerCase();
        // Get token info
        const token = db.prepare(`
      SELECT * FROM launched_tokens WHERE token_address = ?
    `).get(tokenAddr);
        if (!token) {
            return res.status(404).json({ error: 'Token not found' });
        }
        // Get swap stats
        const stats = db.prepare(`
      SELECT
        COUNT(*) as total_swaps,
        SUM(CASE WHEN is_buy = 1 THEN 1 ELSE 0 END) as buy_count,
        SUM(CASE WHEN is_buy = 0 THEN 1 ELSE 0 END) as sell_count,
        SUM(CASE WHEN is_buy = 1 THEN CAST(amount_in AS INTEGER) ELSE 0 END) as total_buy_volume,
        SUM(CASE WHEN is_buy = 0 THEN CAST(amount_out AS INTEGER) ELSE 0 END) as total_sell_volume,
        SUM(CAST(fee_amount AS INTEGER)) as total_fees,
        COUNT(DISTINCT trader_address) as unique_traders
      FROM swaps
      WHERE token_address = ?
    `).get(tokenAddr);
        // Check if graduated
        const graduated = db.prepare(`
      SELECT * FROM graduated_tokens WHERE token_address = ?
    `).get(tokenAddr);
        res.json({
            token: {
                tokenId: token.token_id,
                tokenAddress: token.token_address,
                creator: token.creator,
                name: token.name,
                symbol: token.symbol,
                launchBlock: token.block_number,
                launchTimestamp: token.timestamp,
            },
            stats: {
                totalSwaps: stats.total_swaps || 0,
                buyCount: stats.buy_count || 0,
                sellCount: stats.sell_count || 0,
                totalBuyVolume: stats.total_buy_volume?.toString() || '0',
                totalSellVolume: stats.total_sell_volume?.toString() || '0',
                totalFees: stats.total_fees?.toString() || '0',
                uniqueTraders: stats.unique_traders || 0,
            },
            graduated: graduated ? {
                liquidityAmount: graduated.liquidity_amount,
                treasuryFee: graduated.treasury_fee,
                timestamp: graduated.timestamp,
            } : null,
        });
    }
    catch (error) {
        console.error('Error fetching token stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// ═══════════════════════════════════════
// POOL ENDPOINTS
// ═══════════════════════════════════════
// Get today's airdrop pool stats
app.get('/api/pool/today', (req, res) => {
    try {
        const pool = (0, database_1.getTodayAirdropPool)();
        const totalContribution = (0, database_1.getTotalPoolContribution)();
        res.json({
            date: pool.date,
            totalUserFees: pool.totalUserFees,
            totalTreasuryFees: pool.totalTreasuryFees,
            distributed: pool.distributed,
            totalPoolContribution: totalContribution.toString(),
        });
    }
    catch (error) {
        console.error('Error fetching pool stats:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});
// Get fee structure info
app.get('/api/fees', (req, res) => {
    res.json({
        treasury: config_1.TREASURY_WALLET,
        fees: {
            buy: {
                totalBps: config_1.FEES.BUY_TOTAL_BPS,
                userPoolBps: config_1.FEES.BUY_USER_BPS,
                treasuryBps: config_1.FEES.BUY_TREASURY_BPS,
            },
            sell: {
                totalBps: config_1.FEES.SELL_TOTAL_BPS,
                userPoolBps: config_1.FEES.SELL_USER_BPS,
                treasuryBps: config_1.FEES.SELL_TREASURY_BPS,
            },
            graduation: {
                treasuryFeeBps: config_1.FEES.GRADUATION_FEE_BPS,
            },
            referral: {
                bps: config_1.FEES.REFERRAL_BPS,
            },
        },
        graduationLiquidity: {
            pulsexV2Percent: config_1.GRADUATION_LIQUIDITY.PULSEX_V2_PERCENT,
            paisleyV2Percent: config_1.GRADUATION_LIQUIDITY.PAISLEY_V2_PERCENT,
            lpBurned: true,
        },
    });
});
// ═══════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════
async function startServer() {
    await (0, database_1.initDatabase)();
    app.listen(PORT, () => {
        console.log('═══════════════════════════════════════');
        console.log(`🌐 PUMP.FUD API Server`);
        console.log(`📍 http://localhost:${PORT}`);
        console.log('═══════════════════════════════════════');
        console.log('Endpoints:');
        console.log('  GET  /api/leaderboard/airdrop');
        console.log('  GET  /api/leaderboard/referral');
        console.log('  GET  /api/leaderboard/roi');
        console.log('  GET  /api/user/:address');
        console.log('  GET  /api/user/:address/rank');
        console.log('  GET  /api/user/:address/positions');
        console.log('  POST /api/referral/register');
        console.log('  GET  /api/referral/code/:code');
        console.log('  GET  /api/tokens/creator/:address');
        console.log('  GET  /api/token/:address');
        console.log('  GET  /api/pool/today');
        console.log('  GET  /api/fees');
        console.log('═══════════════════════════════════════');
    });
}
startServer();
//# sourceMappingURL=api.js.map