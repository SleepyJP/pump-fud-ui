import { NextResponse } from 'next/server';
import { createPublicClient, http, parseAbiItem } from 'viem';
import { pulsechain } from 'viem/chains';

const FACTORY = '0x6317446972E2AcA317d7a1ef27D1412AFFcF8E27' as const;
const FEES = {
  BUY_TOTAL_BPS: 100,
  BUY_USER_BPS: 50,
  SELL_TOTAL_BPS: 110,
  SELL_USER_BPS: 50,
};

const client = createPublicClient({
  chain: pulsechain,
  transport: http('https://rpc.pulsechain.com'),
});

export async function GET(
  request: Request,
  { params }: { params: Promise<{ address: string }> }
) {
  const { address } = await params;
  const userAddress = address.toLowerCase();

  try {
    const currentBlock = await client.getBlockNumber();
    const fromBlock = currentBlock - 50000n;

    // Get all tokens
    const tokenCreatedEvent = parseAbiItem('event TokenCreated(address indexed token, address indexed creator, string name, string symbol, address referrer)');
    const tokenLogs = await client.getLogs({
      address: FACTORY,
      event: tokenCreatedEvent,
      fromBlock,
      toBlock: currentBlock,
    });
    const tokenAddresses = tokenLogs.map(log => (log.args as any).token as `0x${string}`);

    const buyEvent = parseAbiItem('event TokenBought(address indexed buyer, uint256 plsSpent, uint256 tokensBought, address indexed referrer)');
    const sellEvent = parseAbiItem('event TokenSold(address indexed seller, uint256 tokensSold, uint256 plsReceived)');

    let totalBuys = 0n;
    let totalSells = 0n;
    let totalFeesPaid = 0n;
    let userPoolContribution = 0n;
    let swapCount = 0;

    for (const tokenAddr of tokenAddresses) {
      try {
        const buyLogs = await client.getLogs({
          address: tokenAddr,
          event: buyEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of buyLogs) {
          const buyer = ((log.args as any).buyer as string).toLowerCase();
          if (buyer === userAddress) {
            const plsSpent = (log.args as any).plsSpent as bigint;
            totalBuys += plsSpent;
            totalFeesPaid += (plsSpent * BigInt(FEES.BUY_TOTAL_BPS)) / 10000n;
            userPoolContribution += (plsSpent * BigInt(FEES.BUY_USER_BPS)) / 10000n;
            swapCount++;
          }
        }

        const sellLogs = await client.getLogs({
          address: tokenAddr,
          event: sellEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of sellLogs) {
          const seller = ((log.args as any).seller as string).toLowerCase();
          if (seller === userAddress) {
            const plsReceived = (log.args as any).plsReceived as bigint;
            totalSells += plsReceived;
            totalFeesPaid += (plsReceived * BigInt(FEES.SELL_TOTAL_BPS)) / 10000n;
            userPoolContribution += (plsReceived * BigInt(FEES.SELL_USER_BPS)) / 10000n;
            swapCount++;
          }
        }
      } catch {
        continue;
      }
    }

    return NextResponse.json({
      address: userAddress,
      totalBuys: totalBuys.toString(),
      totalSells: totalSells.toString(),
      totalFeesPaid: totalFeesPaid.toString(),
      userPoolContribution: userPoolContribution.toString(),
      swapCount,
      lastSwapTime: null,
      totalAirdropsReceived: '0',
      referralCode: userAddress.slice(2, 10).toUpperCase(),
      referredBy: null,
      referralCount: 0,
      referralEarnings: '0',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
