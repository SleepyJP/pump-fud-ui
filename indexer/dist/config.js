"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.INDEXER_CONFIG = exports.CHAIN = exports.TOKEN_ABI = exports.FACTORY_ABI = exports.GRADUATION_LIQUIDITY = exports.FEES = exports.TREASURY_WALLET = void 0;
exports.calculateBuyFees = calculateBuyFees;
exports.calculateSellFees = calculateSellFees;
exports.calculateGraduationFee = calculateGraduationFee;
exports.calculateReferralFee = calculateReferralFee;
const viem_1 = require("viem");
// Treasury wallet - receives:
// - 0.5% from buys (immediately)
// - 0.6% from sells (immediately)
// - 10% graduation success fee
exports.TREASURY_WALLET = '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B';
// Fee structure
exports.FEES = {
    // Buy fee: 1.0% total
    BUY_TOTAL_BPS: 100, // 1.0%
    BUY_USER_BPS: 50, // 0.5% to user airdrop pool
    BUY_TREASURY_BPS: 50, // 0.5% to treasury
    // Sell fee: 1.1% total
    SELL_TOTAL_BPS: 110, // 1.1%
    SELL_USER_BPS: 50, // 0.5% to user airdrop pool
    SELL_TREASURY_BPS: 60, // 0.6% to treasury
    // Graduation success fee
    GRADUATION_FEE_BPS: 1000, // 10% of liquidity to treasury before DEX distribution
    // Referral fee (from treasury portion)
    REFERRAL_BPS: 25, // 0.25% to referrer (taken from treasury portion)
};
// Liquidity distribution on graduation (after 10% treasury fee)
exports.GRADUATION_LIQUIDITY = {
    PULSEX_V2_PERCENT: 10, // 10% to PulseX V2
    PAISLEY_V2_PERCENT: 10, // 10% to Paisley Swap V2
    // LP tokens burned to dead address
};
// Factory ABI - events we need to track
exports.FACTORY_ABI = (0, viem_1.parseAbi)([
    'event TokenLaunched(uint256 indexed tokenId, address indexed tokenAddress, address indexed creator, string name, string symbol)',
    'event TokenGraduated(uint256 indexed tokenId, address indexed tokenAddress, uint256 liquidityAmount, uint256 treasuryFee)',
    'event TokenDelisted(uint256 indexed tokenId, address indexed tokenAddress, string reason)',
]);
// Token ABI - swap events
exports.TOKEN_ABI = (0, viem_1.parseAbi)([
    'event Buy(address indexed buyer, uint256 plsIn, uint256 tokensOut, uint256 fee)',
    'event Sell(address indexed seller, uint256 tokensIn, uint256 plsOut, uint256 fee)',
    'event Transfer(address indexed from, address indexed to, uint256 value)',
    'function graduated() view returns (bool)',
    'function plsReserve() view returns (uint256)',
    'function creator() view returns (address)',
    'function getCurrentPrice() view returns (uint256)',
]);
// Chain config
exports.CHAIN = {
    id: 369,
    name: 'PulseChain',
    rpcUrl: process.env.RPC_URL || 'https://rpc.pulsechain.com',
    blockTime: 10, // ~10 seconds per block
};
// Indexer config
exports.INDEXER_CONFIG = {
    // How many blocks to process per batch
    BATCH_SIZE: 1000,
    // Polling interval (ms) for new blocks
    POLL_INTERVAL: 10000,
    // Confirmations before processing
    CONFIRMATIONS: 2,
};
// Calculate fees from amount
function calculateBuyFees(plsAmount) {
    const totalFee = (plsAmount * BigInt(exports.FEES.BUY_TOTAL_BPS)) / 10000n;
    const userFee = (plsAmount * BigInt(exports.FEES.BUY_USER_BPS)) / 10000n;
    const treasuryFee = (plsAmount * BigInt(exports.FEES.BUY_TREASURY_BPS)) / 10000n;
    return { totalFee, userFee, treasuryFee };
}
function calculateSellFees(plsAmount) {
    const totalFee = (plsAmount * BigInt(exports.FEES.SELL_TOTAL_BPS)) / 10000n;
    const userFee = (plsAmount * BigInt(exports.FEES.SELL_USER_BPS)) / 10000n;
    const treasuryFee = (plsAmount * BigInt(exports.FEES.SELL_TREASURY_BPS)) / 10000n;
    return { totalFee, userFee, treasuryFee };
}
function calculateGraduationFee(liquidityAmount) {
    return (liquidityAmount * BigInt(exports.FEES.GRADUATION_FEE_BPS)) / 10000n;
}
function calculateReferralFee(treasuryFee) {
    // Referral fee comes out of treasury portion
    return (treasuryFee * BigInt(exports.FEES.REFERRAL_BPS * 2)) / BigInt(exports.FEES.BUY_TREASURY_BPS);
}
//# sourceMappingURL=config.js.map