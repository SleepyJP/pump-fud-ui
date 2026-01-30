"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const viem_1 = require("viem");
const chains_1 = require("viem/chains");
const config_1 = require("./config");
const database_1 = require("./database");
require("dotenv/config");
const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS;
const START_BLOCK = BigInt(process.env.START_BLOCK || '0');
if (!FACTORY_ADDRESS) {
    console.error('❌ FACTORY_ADDRESS not set in environment');
    process.exit(1);
}
// Create viem client
const client = (0, viem_1.createPublicClient)({
    chain: chains_1.pulsechain,
    transport: (0, viem_1.http)(config_1.CHAIN.rpcUrl),
});
// Track active tokens (launched but not graduated/delisted)
const activeTokens = new Set();
// Load active tokens from database
function loadActiveTokens() {
    const db = (0, database_1.getDb)();
    const rows = db.prepare(`
    SELECT DISTINCT token_address FROM swaps
    WHERE token_address NOT IN (
      SELECT token_address FROM graduated_tokens
    )
  `).all();
    rows.forEach((row) => {
        activeTokens.add(row.token_address);
    });
    console.log(`📋 Loaded ${activeTokens.size} active tokens`);
}
// Process TokenLaunched event
async function handleTokenLaunched(log) {
    try {
        const decoded = (0, viem_1.decodeEventLog)({
            abi: config_1.FACTORY_ABI,
            data: log.data,
            topics: log.topics,
        });
        const { tokenId, tokenAddress, creator, name, symbol } = decoded.args;
        console.log(`🚀 Token Launched: ${name} (${symbol}) at ${tokenAddress}`);
        activeTokens.add(tokenAddress);
        // Record token in database
        const db = (0, database_1.getDb)();
        db.prepare(`
      INSERT OR IGNORE INTO launched_tokens
      (token_id, token_address, creator, name, symbol, block_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tokenId.toString(), tokenAddress.toLowerCase(), creator.toLowerCase(), name, symbol, Number(log.blockNumber), Math.floor(Date.now() / 1000));
    }
    catch (e) {
        console.error('Error handling TokenLaunched:', e);
    }
}
// Process TokenGraduated event
async function handleTokenGraduated(log) {
    try {
        const decoded = (0, viem_1.decodeEventLog)({
            abi: config_1.FACTORY_ABI,
            data: log.data,
            topics: log.topics,
        });
        const { tokenId, tokenAddress, liquidityAmount, treasuryFee } = decoded.args;
        console.log(`🎓 Token Graduated: ${tokenAddress} - Liquidity: ${liquidityAmount}, Treasury Fee: ${treasuryFee}`);
        activeTokens.delete(tokenAddress);
        // Record graduation
        const db = (0, database_1.getDb)();
        db.prepare(`
      INSERT OR IGNORE INTO graduated_tokens
      (token_id, token_address, liquidity_amount, treasury_fee, block_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(tokenId.toString(), tokenAddress.toLowerCase(), liquidityAmount.toString(), treasuryFee.toString(), Number(log.blockNumber), Math.floor(Date.now() / 1000));
    }
    catch (e) {
        console.error('Error handling TokenGraduated:', e);
    }
}
// Process TokenDelisted event
async function handleTokenDelisted(log) {
    try {
        const decoded = (0, viem_1.decodeEventLog)({
            abi: config_1.FACTORY_ABI,
            data: log.data,
            topics: log.topics,
        });
        const { tokenId, tokenAddress, reason } = decoded.args;
        console.log(`❌ Token Delisted: ${tokenAddress} - Reason: ${reason}`);
        activeTokens.delete(tokenAddress);
    }
    catch (e) {
        console.error('Error handling TokenDelisted:', e);
    }
}
// Process Buy event (V2 format)
async function handleBuy(log, tokenAddress) {
    try {
        // V2: { token, buyer, plsIn, tokensOut, referrer }
        const args = log.args;
        const buyer = args.buyer;
        const plsIn = args.plsIn;
        const tokensOut = args.tokensOut;
        const eventReferrer = args.referrer;
        const fees = (0, config_1.calculateBuyFees)(plsIn);
        // Check referrer from event or database
        const referrer = eventReferrer && eventReferrer !== '0x0000000000000000000000000000000000000000'
            ? eventReferrer
            : (0, database_1.getReferrer)(buyer);
        let referrerFee = 0n;
        if (referrer) {
            referrerFee = (0, config_1.calculateReferralFee)(fees.treasuryFee);
        }
        console.log(`💰 Buy: ${buyer} bought ${tokensOut} tokens for ${plsIn} PLS on ${tokenAddress}`);
        (0, database_1.recordSwap)({
            txHash: log.transactionHash,
            blockNumber: Number(log.blockNumber),
            timestamp: Math.floor(Date.now() / 1000),
            tokenAddress: tokenAddress,
            traderAddress: buyer,
            isBuy: true,
            amountIn: plsIn,
            amountOut: tokensOut,
            feeAmount: fees.totalFee,
            userFee: fees.userFee,
            treasuryFee: fees.treasuryFee - referrerFee,
            referrerAddress: referrer || undefined,
            referrerFee: referrerFee > 0n ? referrerFee : undefined,
        });
    }
    catch (e) {
        console.error('Error handling Buy:', e);
    }
}
// Process Sell event (V2 format)
async function handleSell(log, tokenAddress) {
    try {
        // V2: { token, seller, tokensIn, plsOut, referrer }
        const args = log.args;
        const seller = args.seller;
        const tokensIn = args.tokensIn;
        const plsOut = args.plsOut;
        const eventReferrer = args.referrer;
        const fees = (0, config_1.calculateSellFees)(plsOut);
        // Check referrer from event or database
        const referrer = eventReferrer && eventReferrer !== '0x0000000000000000000000000000000000000000'
            ? eventReferrer
            : (0, database_1.getReferrer)(seller);
        let referrerFee = 0n;
        if (referrer) {
            referrerFee = (0, config_1.calculateReferralFee)(fees.treasuryFee);
        }
        console.log(`💸 Sell: ${seller} sold ${tokensIn} tokens for ${plsOut} PLS on ${tokenAddress}`);
        (0, database_1.recordSwap)({
            txHash: log.transactionHash,
            blockNumber: Number(log.blockNumber),
            timestamp: Math.floor(Date.now() / 1000),
            tokenAddress: tokenAddress,
            traderAddress: seller,
            isBuy: false,
            amountIn: tokensIn,
            amountOut: plsOut,
            feeAmount: fees.totalFee,
            userFee: fees.userFee,
            treasuryFee: fees.treasuryFee - referrerFee,
            referrerAddress: referrer || undefined,
            referrerFee: referrerFee > 0n ? referrerFee : undefined,
        });
    }
    catch (e) {
        console.error('Error handling Sell:', e);
    }
}
// Process a block range
async function processBlockRange(fromBlock, toBlock) {
    console.log(`📦 Processing blocks ${fromBlock} to ${toBlock}`);
    // Get factory events
    const factoryLogs = await client.getLogs({
        address: FACTORY_ADDRESS,
        events: config_1.FACTORY_ABI,
        fromBlock,
        toBlock,
    });
    for (const log of factoryLogs) {
        const eventName = log.eventName;
        if (eventName === 'TokenLaunched') {
            await handleTokenLaunched(log);
        }
        else if (eventName === 'TokenGraduated') {
            await handleTokenGraduated(log);
        }
        else if (eventName === 'TokenDelisted') {
            await handleTokenDelisted(log);
        }
    }
    // V2: Get swap events from FACTORY (not individual tokens)
    const buyEvent = (0, viem_1.parseAbiItem)('event TokenBought(address indexed token, address indexed buyer, uint256 plsIn, uint256 tokensOut, address referrer)');
    const sellEvent = (0, viem_1.parseAbiItem)('event TokenSold(address indexed token, address indexed seller, uint256 tokensIn, uint256 plsOut, address referrer)');
    try {
        const buyLogs = await client.getLogs({
            address: FACTORY_ADDRESS,
            event: buyEvent,
            fromBlock,
            toBlock,
        });
        for (const log of buyLogs) {
            const args = log.args;
            if (args?.token) {
                activeTokens.add(args.token);
                await handleBuy(log, args.token);
            }
        }
        const sellLogs = await client.getLogs({
            address: FACTORY_ADDRESS,
            event: sellEvent,
            fromBlock,
            toBlock,
        });
        for (const log of sellLogs) {
            const args = log.args;
            if (args?.token) {
                await handleSell(log, args.token);
            }
        }
    }
    catch (e) {
        console.error('Error fetching V2 swap logs:', e);
    }
    // Update last processed block
    (0, database_1.setIndexerState)('lastProcessedBlock', toBlock.toString());
}
// Main indexer loop
async function runIndexer() {
    console.log('═══════════════════════════════════════');
    console.log('🔥 PUMP.FUD Indexer Starting');
    console.log(`📍 Factory: ${FACTORY_ADDRESS}`);
    console.log(`🌐 RPC: ${config_1.CHAIN.rpcUrl}`);
    console.log('═══════════════════════════════════════');
    // Initialize database (async now with sql.js)
    await (0, database_1.initDatabase)();
    // Load active tokens
    loadActiveTokens();
    // Get starting block
    const lastProcessedStr = (0, database_1.getIndexerState)('lastProcessedBlock');
    let lastProcessed = lastProcessedStr ? BigInt(lastProcessedStr) : START_BLOCK - 1n;
    console.log(`📊 Starting from block ${lastProcessed + 1n}`);
    // Main loop
    while (true) {
        try {
            const currentBlock = await client.getBlockNumber();
            const safeBlock = currentBlock - BigInt(config_1.INDEXER_CONFIG.CONFIRMATIONS);
            if (safeBlock <= lastProcessed) {
                // Wait for new blocks
                await new Promise(resolve => setTimeout(resolve, config_1.INDEXER_CONFIG.POLL_INTERVAL));
                continue;
            }
            // Process in batches
            let fromBlock = lastProcessed + 1n;
            while (fromBlock <= safeBlock) {
                const toBlock = fromBlock + BigInt(config_1.INDEXER_CONFIG.BATCH_SIZE) - 1n;
                const endBlock = toBlock > safeBlock ? safeBlock : toBlock;
                await processBlockRange(fromBlock, endBlock);
                lastProcessed = endBlock;
                fromBlock = endBlock + 1n;
            }
        }
        catch (error) {
            console.error('❌ Indexer error:', error);
            await new Promise(resolve => setTimeout(resolve, config_1.INDEXER_CONFIG.POLL_INTERVAL));
        }
    }
}
// Start the indexer
runIndexer().catch(console.error);
//# sourceMappingURL=indexer.js.map