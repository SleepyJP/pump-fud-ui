import { createPublicClient, http, parseAbiItem, Log, decodeEventLog } from 'viem';
import { pulsechain } from 'viem/chains';
import {
  FACTORY_ABI,
  TOKEN_ABI,
  CHAIN,
  INDEXER_CONFIG,
  FEES,
  TREASURY_WALLET,
  calculateBuyFees,
  calculateSellFees,
  calculateGraduationFee,
  calculateReferralFee,
} from './config';
import {
  initDatabase,
  recordSwap,
  getIndexerState,
  setIndexerState,
  getReferrer,
  getDb,
} from './database';
import 'dotenv/config';

const FACTORY_ADDRESS = process.env.FACTORY_ADDRESS as `0x${string}`;
const START_BLOCK = BigInt(process.env.START_BLOCK || '0');

if (!FACTORY_ADDRESS) {
  console.error('❌ FACTORY_ADDRESS not set in environment');
  process.exit(1);
}

// Create viem client
const client = createPublicClient({
  chain: pulsechain,
  transport: http(CHAIN.rpcUrl),
});

// Track active tokens (launched but not graduated/delisted)
const activeTokens = new Set<`0x${string}`>();

// Load active tokens from database
function loadActiveTokens() {
  const db = getDb();
  const rows = db.prepare(`
    SELECT DISTINCT token_address FROM swaps
    WHERE token_address NOT IN (
      SELECT token_address FROM graduated_tokens
    )
  `).all() as any[];

  rows.forEach((row) => {
    activeTokens.add(row.token_address as `0x${string}`);
  });
  console.log(`📋 Loaded ${activeTokens.size} active tokens`);
}

// Process TokenLaunched event
async function handleTokenLaunched(log: Log) {
  try {
    const decoded = decodeEventLog({
      abi: FACTORY_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { tokenId, tokenAddress, creator, name, symbol } = decoded.args as any;
    console.log(`🚀 Token Launched: ${name} (${symbol}) at ${tokenAddress}`);

    activeTokens.add(tokenAddress as `0x${string}`);

    // Record token in database
    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO launched_tokens
      (token_id, token_address, creator, name, symbol, block_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      tokenId.toString(),
      tokenAddress.toLowerCase(),
      creator.toLowerCase(),
      name,
      symbol,
      Number(log.blockNumber),
      Math.floor(Date.now() / 1000)
    );
  } catch (e) {
    console.error('Error handling TokenLaunched:', e);
  }
}

// Process TokenGraduated event
async function handleTokenGraduated(log: Log) {
  try {
    const decoded = decodeEventLog({
      abi: FACTORY_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { tokenId, tokenAddress, liquidityAmount, treasuryFee } = decoded.args as any;
    console.log(`🎓 Token Graduated: ${tokenAddress} - Liquidity: ${liquidityAmount}, Treasury Fee: ${treasuryFee}`);

    activeTokens.delete(tokenAddress as `0x${string}`);

    // Record graduation
    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO graduated_tokens
      (token_id, token_address, liquidity_amount, treasury_fee, block_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      tokenId.toString(),
      tokenAddress.toLowerCase(),
      liquidityAmount.toString(),
      treasuryFee.toString(),
      Number(log.blockNumber),
      Math.floor(Date.now() / 1000)
    );
  } catch (e) {
    console.error('Error handling TokenGraduated:', e);
  }
}

// Process TokenDelisted event
async function handleTokenDelisted(log: Log) {
  try {
    const decoded = decodeEventLog({
      abi: FACTORY_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { tokenId, tokenAddress, reason } = decoded.args as any;
    console.log(`❌ Token Delisted: ${tokenAddress} - Reason: ${reason}`);

    activeTokens.delete(tokenAddress as `0x${string}`);
  } catch (e) {
    console.error('Error handling TokenDelisted:', e);
  }
}

// Process Buy event
async function handleBuy(log: Log, tokenAddress: `0x${string}`) {
  try {
    const decoded = decodeEventLog({
      abi: TOKEN_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { buyer, plsIn, tokensOut, fee } = decoded.args as any;
    const fees = calculateBuyFees(plsIn);

    // Check if buyer has a referrer
    const referrer = getReferrer(buyer);
    let referrerFee = 0n;
    if (referrer) {
      referrerFee = calculateReferralFee(fees.treasuryFee);
    }

    console.log(`💰 Buy: ${buyer} bought ${tokensOut} tokens for ${plsIn} PLS (fee: ${fee})`);

    recordSwap({
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      tokenAddress: tokenAddress,
      traderAddress: buyer,
      isBuy: true,
      amountIn: plsIn,
      amountOut: tokensOut,
      feeAmount: fee,
      userFee: fees.userFee,
      treasuryFee: fees.treasuryFee - referrerFee,
      referrerAddress: referrer || undefined,
      referrerFee: referrerFee > 0n ? referrerFee : undefined,
    });
  } catch (e) {
    console.error('Error handling Buy:', e);
  }
}

// Process Sell event
async function handleSell(log: Log, tokenAddress: `0x${string}`) {
  try {
    const decoded = decodeEventLog({
      abi: TOKEN_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { seller, tokensIn, plsOut, fee } = decoded.args as any;
    const fees = calculateSellFees(plsOut);

    // Check if seller has a referrer
    const referrer = getReferrer(seller);
    let referrerFee = 0n;
    if (referrer) {
      referrerFee = calculateReferralFee(fees.treasuryFee);
    }

    console.log(`💸 Sell: ${seller} sold ${tokensIn} tokens for ${plsOut} PLS (fee: ${fee})`);

    recordSwap({
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      tokenAddress: tokenAddress,
      traderAddress: seller,
      isBuy: false,
      amountIn: tokensIn,
      amountOut: plsOut,
      feeAmount: fee,
      userFee: fees.userFee,
      treasuryFee: fees.treasuryFee - referrerFee,
      referrerAddress: referrer || undefined,
      referrerFee: referrerFee > 0n ? referrerFee : undefined,
    });
  } catch (e) {
    console.error('Error handling Sell:', e);
  }
}

// Process a block range
async function processBlockRange(fromBlock: bigint, toBlock: bigint) {
  console.log(`📦 Processing blocks ${fromBlock} to ${toBlock}`);

  // Get factory events
  const factoryLogs = await client.getLogs({
    address: FACTORY_ADDRESS,
    events: FACTORY_ABI,
    fromBlock,
    toBlock,
  });

  for (const log of factoryLogs) {
    const eventName = log.eventName;
    if (eventName === 'TokenLaunched') {
      await handleTokenLaunched(log);
    } else if (eventName === 'TokenGraduated') {
      await handleTokenGraduated(log);
    } else if (eventName === 'TokenDelisted') {
      await handleTokenDelisted(log);
    }
  }

  // Get swap events from active tokens
  if (activeTokens.size > 0) {
    const buyEvent = parseAbiItem('event Buy(address indexed buyer, uint256 plsIn, uint256 tokensOut, uint256 fee)');
    const sellEvent = parseAbiItem('event Sell(address indexed seller, uint256 tokensIn, uint256 plsOut, uint256 fee)');

    for (const tokenAddress of activeTokens) {
      try {
        const buyLogs = await client.getLogs({
          address: tokenAddress,
          event: buyEvent,
          fromBlock,
          toBlock,
        });

        for (const log of buyLogs) {
          await handleBuy(log, tokenAddress);
        }

        const sellLogs = await client.getLogs({
          address: tokenAddress,
          event: sellEvent,
          fromBlock,
          toBlock,
        });

        for (const log of sellLogs) {
          await handleSell(log, tokenAddress);
        }
      } catch (e) {
        console.error(`Error fetching logs for ${tokenAddress}:`, e);
      }
    }
  }

  // Update last processed block
  setIndexerState('lastProcessedBlock', toBlock.toString());
}

// Main indexer loop
async function runIndexer() {
  console.log('═══════════════════════════════════════');
  console.log('🔥 PUMP.FUD Indexer Starting');
  console.log(`📍 Factory: ${FACTORY_ADDRESS}`);
  console.log(`🌐 RPC: ${CHAIN.rpcUrl}`);
  console.log('═══════════════════════════════════════');

  // Initialize database (async now with sql.js)
  await initDatabase();

  // Load active tokens
  loadActiveTokens();

  // Get starting block
  const lastProcessedStr = getIndexerState('lastProcessedBlock');
  let lastProcessed = lastProcessedStr ? BigInt(lastProcessedStr) : START_BLOCK - 1n;

  console.log(`📊 Starting from block ${lastProcessed + 1n}`);

  // Main loop
  while (true) {
    try {
      const currentBlock = await client.getBlockNumber();
      const safeBlock = currentBlock - BigInt(INDEXER_CONFIG.CONFIRMATIONS);

      if (safeBlock <= lastProcessed) {
        // Wait for new blocks
        await new Promise(resolve => setTimeout(resolve, INDEXER_CONFIG.POLL_INTERVAL));
        continue;
      }

      // Process in batches
      let fromBlock = lastProcessed + 1n;
      while (fromBlock <= safeBlock) {
        const toBlock = fromBlock + BigInt(INDEXER_CONFIG.BATCH_SIZE) - 1n;
        const endBlock = toBlock > safeBlock ? safeBlock : toBlock;

        await processBlockRange(fromBlock, endBlock);
        lastProcessed = endBlock;
        fromBlock = endBlock + 1n;
      }

    } catch (error) {
      console.error('❌ Indexer error:', error);
      await new Promise(resolve => setTimeout(resolve, INDEXER_CONFIG.POLL_INTERVAL));
    }
  }
}

// Start the indexer
runIndexer().catch(console.error);
