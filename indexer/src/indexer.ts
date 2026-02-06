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

// Load active tokens from database (launched but not graduated/delisted)
function loadActiveTokens() {
  const db = getDb();

  // First, load all launched tokens
  const launchedRows = db.prepare(`
    SELECT token_address FROM launched_tokens
  `).all() as any[];

  // Then get graduated tokens to exclude
  const graduatedRows = db.prepare(`
    SELECT token_address FROM graduated_tokens
  `).all() as any[];
  const graduatedSet = new Set(graduatedRows.map((r: any) => r.token_address.toLowerCase()));

  // Also get any unique tokens from swaps table (for tokens launched before indexer started)
  const swapRows = db.prepare(`
    SELECT DISTINCT token_address FROM swaps
  `).all() as any[];

  // Add launched tokens (excluding graduated)
  launchedRows.forEach((row) => {
    const addr = row.token_address.toLowerCase();
    if (!graduatedSet.has(addr)) {
      activeTokens.add(addr as `0x${string}`);
    }
  });

  // Add tokens from swaps (excluding graduated)
  swapRows.forEach((row) => {
    const addr = row.token_address.toLowerCase();
    if (!graduatedSet.has(addr)) {
      activeTokens.add(addr as `0x${string}`);
    }
  });

  console.log(`📋 Loaded ${activeTokens.size} active tokens from database`);
}

// Process TokenCreated event (V4 Factory)
// Event: TokenCreated(address indexed token, address indexed creator, string name, string symbol, address referrer)
async function handleTokenCreated(log: Log) {
  try {
    const decoded = decodeEventLog({
      abi: FACTORY_ABI,
      data: log.data,
      topics: log.topics,
    });

    const { token, creator, name, symbol, referrer } = decoded.args as any;
    console.log(`🚀 Token Created: ${name} (${symbol}) at ${token}`);

    activeTokens.add(token as `0x${string}`);

    // Record token in database
    const db = getDb();
    db.prepare(`
      INSERT OR IGNORE INTO launched_tokens
      (token_id, token_address, creator, name, symbol, block_number, timestamp)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      '0', // No tokenId in V4 format
      token.toLowerCase(),
      creator.toLowerCase(),
      name,
      symbol,
      Number(log.blockNumber),
      Math.floor(Date.now() / 1000)
    );

    // Record referral if set
    if (referrer && referrer !== '0x0000000000000000000000000000000000000000') {
      console.log(`  └─ Referred by: ${referrer}`);
    }
  } catch (e) {
    console.error('Error handling TokenCreated:', e);
  }
}

// Check if a token has graduated (call contract function)
async function checkTokenGraduation(tokenAddress: `0x${string}`): Promise<boolean> {
  try {
    const graduated = await client.readContract({
      address: tokenAddress,
      abi: TOKEN_ABI,
      functionName: 'graduated',
    });
    return graduated as boolean;
  } catch (e) {
    return false;
  }
}

// Check if a token is deleted
async function checkTokenDeleted(tokenAddress: `0x${string}`): Promise<boolean> {
  try {
    const deleted = await client.readContract({
      address: tokenAddress,
      abi: TOKEN_ABI,
      functionName: 'deleted',
    });
    return deleted as boolean;
  } catch (e) {
    return false;
  }
}

// Record graduation in database
function recordGraduation(tokenAddress: string, blockNumber: number) {
  const db = getDb();
  db.prepare(`
    INSERT OR IGNORE INTO graduated_tokens
    (token_id, token_address, liquidity_amount, treasury_fee, block_number, timestamp)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(
    '0',
    tokenAddress.toLowerCase(),
    '0', // We don't have this info without event
    '0',
    blockNumber,
    Math.floor(Date.now() / 1000)
  );
  console.log(`🎓 Token Graduated: ${tokenAddress}`);
}

// Process TokenBought event from TOKEN contract
// Event: TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)
async function handleBuy(log: Log & { args?: any }, tokenAddress: `0x${string}`) {
  try {
    const args = (log as any).args;
    const buyer = args.buyer as `0x${string}`;
    const plsSpent = args.plsSpent as bigint;
    const tokensBought = args.tokensBought as bigint;
    const eventReferrer = args.referrer as `0x${string}`;

    const fees = calculateBuyFees(plsSpent);

    // Check referrer from event or database
    const referrer = eventReferrer && eventReferrer !== '0x0000000000000000000000000000000000000000'
      ? eventReferrer
      : getReferrer(buyer);
    let referrerFee = 0n;
    if (referrer) {
      referrerFee = calculateReferralFee(fees.treasuryFee);
    }

    console.log(`💰 Buy: ${buyer} bought ${tokensBought} tokens for ${plsSpent} PLS on ${tokenAddress}`);

    recordSwap({
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      tokenAddress: tokenAddress,
      traderAddress: buyer,
      isBuy: true,
      amountIn: plsSpent,
      amountOut: tokensBought,
      feeAmount: fees.totalFee,
      userFee: fees.userFee,
      treasuryFee: fees.treasuryFee - referrerFee,
      referrerAddress: referrer || undefined,
      referrerFee: referrerFee > 0n ? referrerFee : undefined,
    });
  } catch (e) {
    console.error('Error handling Buy:', e);
  }
}

// Process TokenSold event from TOKEN contract
// Event: TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)
async function handleSell(log: Log & { args?: any }, tokenAddress: `0x${string}`) {
  try {
    const args = (log as any).args;
    const seller = args.seller as `0x${string}`;
    const tokensSold = args.tokensSold as bigint;
    const plsReceived = args.plsReceived as bigint;

    const fees = calculateSellFees(plsReceived);

    // Check referrer from database
    const referrer = getReferrer(seller);
    let referrerFee = 0n;
    if (referrer) {
      referrerFee = calculateReferralFee(fees.treasuryFee);
    }

    console.log(`💸 Sell: ${seller} sold ${tokensSold} tokens for ${plsReceived} PLS on ${tokenAddress}`);

    recordSwap({
      txHash: log.transactionHash!,
      blockNumber: Number(log.blockNumber),
      timestamp: Math.floor(Date.now() / 1000),
      tokenAddress: tokenAddress,
      traderAddress: seller,
      isBuy: false,
      amountIn: tokensSold,
      amountOut: plsReceived,
      feeAmount: fees.totalFee,
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

  // Get factory events first (to discover new tokens)
  const factoryLogs = await client.getLogs({
    address: FACTORY_ADDRESS,
    events: FACTORY_ABI,
    fromBlock,
    toBlock,
  });

  for (const log of factoryLogs) {
    const eventName = log.eventName;
    if (eventName === 'TokenCreated') {
      await handleTokenCreated(log);
    }
    // InitialBuy is also emitted by Factory for createTokenAndBuy
  }

  // Now fetch TokenBought/TokenSold events from INDIVIDUAL TOKEN contracts
  // Events are emitted by token contracts, NOT the factory
  const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
  const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

  // Query each active token for buy/sell events
  // For efficiency, we query in batches if there are many tokens
  const tokenArray = Array.from(activeTokens);

  if (tokenArray.length > 0) {
    // Query Buy events from all active tokens at once (null address = all contracts matching event)
    try {
      const buyLogs = await client.getLogs({
        address: tokenArray.length === 1 ? tokenArray[0] : undefined,
        event: buyEvent,
        fromBlock,
        toBlock,
      });

      for (const log of buyLogs) {
        const tokenAddress = log.address as `0x${string}`;
        // Only process if it's one of our tracked tokens
        if (activeTokens.has(tokenAddress)) {
          await handleBuy(log, tokenAddress);
        }
      }
    } catch (e) {
      // If querying all fails, query each token individually
      console.log('Querying buy events per token...');
      for (const tokenAddress of tokenArray) {
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
        } catch (err) {
          // Silently continue - token may have been destroyed
        }
      }
    }

    try {
      const sellLogs = await client.getLogs({
        address: tokenArray.length === 1 ? tokenArray[0] : undefined,
        event: sellEvent,
        fromBlock,
        toBlock,
      });

      for (const log of sellLogs) {
        const tokenAddress = log.address as `0x${string}`;
        if (activeTokens.has(tokenAddress)) {
          await handleSell(log, tokenAddress);
        }
      }
    } catch (e) {
      // If querying all fails, query each token individually
      console.log('Querying sell events per token...');
      for (const tokenAddress of tokenArray) {
        try {
          const sellLogs = await client.getLogs({
            address: tokenAddress,
            event: sellEvent,
            fromBlock,
            toBlock,
          });
          for (const log of sellLogs) {
            await handleSell(log, tokenAddress);
          }
        } catch (err) {
          // Silently continue
        }
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
