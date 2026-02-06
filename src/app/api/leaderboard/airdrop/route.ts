import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { pulsechain } from 'viem/chains';

// V4 Factory
const FACTORY = '0x6317446972E2AcA317d7a1ef27D1412AFFcF8E27' as const;

// Fee structure (basis points)
const FEES = {
  BUY_TOTAL_BPS: 100,   // 1.0%
  BUY_USER_BPS: 50,     // 0.5% to user airdrop pool
  BUY_TREASURY_BPS: 50, // 0.5% to treasury
  SELL_TOTAL_BPS: 110,  // 1.1%
  SELL_USER_BPS: 50,    // 0.5% to user airdrop pool
  SELL_TREASURY_BPS: 60, // 0.6% to treasury
};

const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com'),
});

// Cache for leaderboard data (in-memory, refreshed every request in serverless)
let cachedData: any = null;
let cacheTime = 0;
const CACHE_TTL = 60000; // 1 minute

export async function GET() {
  try {
    const now = Date.now();

    // Return cached data if fresh
    if (cachedData && now - cacheTime < CACHE_TTL) {
      return NextResponse.json(cachedData);
    }

    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - 50000n; // ~5.8 days of blocks

    // Get TokenBought events from all tokens
    const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
    const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

    // Get TokenCreated to find all tokens
    const tokenCreatedEvent = parseAbiItem('event TokenCreated(address indexed token, address indexed creator, string name, string symbol, address referrer)');

    const tokenLogs = await client.getLogs({
      address: FACTORY,
      event: tokenCreatedEvent,
      fromBlock,
      toBlock: currentBlock,
    });

    const tokenAddresses = tokenLogs.map(log => (log.args as any).token as `0x${string}`);

    // Aggregate user fees
    const userFees: Record<string, { totalFees: bigint; swapCount: number; userPool: bigint }> = {};

    // Get buy/sell events from each token
    for (const tokenAddr of tokenAddresses) {
      try {
        const buyLogs = await client.getLogs({
          address: tokenAddr,
          event: buyEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of buyLogs) {
          const args = log.args as any;
          const buyer = (args.buyer as string).toLowerCase();
          const plsSpent = args.plsSpent as bigint;

          const totalFee = (plsSpent * BigInt(FEES.BUY_TOTAL_BPS)) / 10000n;
          const userPoolFee = (plsSpent * BigInt(FEES.BUY_USER_BPS)) / 10000n;

          if (!userFees[buyer]) {
            userFees[buyer] = { totalFees: 0n, swapCount: 0, userPool: 0n };
          }
          userFees[buyer].totalFees += totalFee;
          userFees[buyer].userPool += userPoolFee;
          userFees[buyer].swapCount += 1;
        }

        const sellLogs = await client.getLogs({
          address: tokenAddr,
          event: sellEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of sellLogs) {
          const args = log.args as any;
          const seller = (args.seller as string).toLowerCase();
          const plsReceived = args.plsReceived as bigint;

          const totalFee = (plsReceived * BigInt(FEES.SELL_TOTAL_BPS)) / 10000n;
          const userPoolFee = (plsReceived * BigInt(FEES.SELL_USER_BPS)) / 10000n;

          if (!userFees[seller]) {
            userFees[seller] = { totalFees: 0n, swapCount: 0, userPool: 0n };
          }
          userFees[seller].totalFees += totalFee;
          userFees[seller].userPool += userPoolFee;
          userFees[seller].swapCount += 1;
        }
      } catch (e) {
        // Token might be deleted/invalid, skip
        continue;
      }
    }

    // Sort by userPool contribution
    const leaderboard = Object.entries(userFees)
      .sort((a, b) => (b[1].userPool > a[1].userPool ? 1 : -1))
      .slice(0, 100)
      .map(([address, data], index) => ({
        address,
        totalFeesPaid: data.totalFees.toString(),
        userPoolContribution: data.userPool.toString(),
        swapCount: data.swapCount,
        rank: index + 1,
      }));

    // Calculate total pool
    const totalUserPool = Object.values(userFees).reduce((sum, u) => sum + u.userPool, 0n);
    const totalTreasuryPool = Object.values(userFees).reduce((sum, u) => sum + u.totalFees - u.userPool, 0n);

    const result = {
      leaderboard,
      pool: {
        date: new Date().toISOString().split('T')[0],
        totalUserFees: totalUserPool.toString(),
        totalTreasuryFees: totalTreasuryPool.toString(),
        distributed: false,
      },
      totalPoolContribution: totalUserPool.toString(),
      feeStructure: FEES,
      tokenCount: tokenAddresses.length,
      blockRange: {
        from: fromBlock.toString(),
        to: currentBlock.toString(),
      },
    };

    // Cache the result
    cachedData = result;
    cacheTime = now;

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('Leaderboard API error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard', details: error.message },
      { status: 500 }
    );
  }
}
