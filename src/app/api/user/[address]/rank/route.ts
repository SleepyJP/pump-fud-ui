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

    // Calculate all user contributions
    const userContributions: Record<string, bigint> = {};

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
          const plsSpent = (log.args as any).plsSpent as bigint;
          const contribution = (plsSpent * BigInt(FEES.BUY_USER_BPS)) / 10000n;
          userContributions[buyer] = (userContributions[buyer] || 0n) + contribution;
        }

        const sellLogs = await client.getLogs({
          address: tokenAddr,
          event: sellEvent,
          fromBlock,
          toBlock: currentBlock,
        });

        for (const log of sellLogs) {
          const seller = ((log.args as any).seller as string).toLowerCase();
          const plsReceived = (log.args as any).plsReceived as bigint;
          const contribution = (plsReceived * BigInt(FEES.SELL_USER_BPS)) / 10000n;
          userContributions[seller] = (userContributions[seller] || 0n) + contribution;
        }
      } catch {
        continue;
      }
    }

    // Sort and find rank
    const sorted = Object.entries(userContributions)
      .sort((a, b) => (b[1] > a[1] ? 1 : -1));

    const rank = sorted.findIndex(([addr]) => addr === userAddress) + 1;
    const userPoolContribution = userContributions[userAddress] || 0n;
    const totalPoolContribution = Object.values(userContributions).reduce((sum, c) => sum + c, 0n);

    const estimatedShare = totalPoolContribution > 0n
      ? Number((userPoolContribution * 10000n) / totalPoolContribution) / 100
      : 0;

    return NextResponse.json({
      rank: rank || 0,
      userPoolContribution: userPoolContribution.toString(),
      totalPoolContribution: totalPoolContribution.toString(),
      estimatedShare,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
