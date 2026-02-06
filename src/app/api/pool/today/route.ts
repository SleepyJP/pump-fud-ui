import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { pulsechain } from 'viem/chains';

const FACTORY = '0x6317446972E2AcA317d7a1ef27D1412AFFcF8E27' as const;
const FEES = {
  BUY_USER_BPS: 50,
  SELL_USER_BPS: 50,
};

const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com'),
});

export async function GET() {
  try {
    const currentBlock = await client.getBlockNumber();
    // Today's pool = last ~8640 blocks (~24 hours)
    const fromBlock = currentBlock - 8640n;

    // Get token addresses
    const tokenCreatedEvent = parseAbiItem('event TokenCreated(address indexed token, address indexed creator, string name, string symbol, address referrer)');
    const tokenLogs = await client.getLogs({
      address: FACTORY,
      event: tokenCreatedEvent,
      fromBlock: currentBlock - 50000n,
      toBlock: currentBlock,
    });
    const tokenAddresses = tokenLogs.map(log => (log.args as any).token as `0x${string}`);

    const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
    const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

    let totalUserFees = 0n;
    let totalTreasuryFees = 0n;

    for (const tokenAddr of tokenAddresses) {
      try {
        const buyLogs = await client.getLogs({
          address: tokenAddr,
          event: buyEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of buyLogs) {
          const plsSpent = (log.args as any).plsSpent as bigint;
          totalUserFees += (plsSpent * BigInt(FEES.BUY_USER_BPS)) / 10000n;
          totalTreasuryFees += (plsSpent * BigInt(50)) / 10000n;
        }

        const sellLogs = await client.getLogs({
          address: tokenAddr,
          event: sellEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of sellLogs) {
          const plsReceived = (log.args as any).plsReceived as bigint;
          totalUserFees += (plsReceived * BigInt(FEES.SELL_USER_BPS)) / 10000n;
          totalTreasuryFees += (plsReceived * BigInt(60)) / 10000n;
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      date: new Date().toISOString().split('T')[0],
      totalUserFees: totalUserFees.toString(),
      totalTreasuryFees: totalTreasuryFees.toString(),
      distributed: false,
      totalPoolContribution: totalUserFees.toString(),
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
