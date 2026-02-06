import { NextResponse } from 'next/server';

// Fee structure for PUMP.FUD platform
const FEES = {
  // Buy fee: 1.0% total
  buy: {
    total: '1.0%',
    totalBps: 100,
    breakdown: {
      userPool: '0.5%',
      userPoolBps: 50,
      treasury: '0.5%',
      treasuryBps: 50,
    },
  },
  // Sell fee: 1.1% total
  sell: {
    total: '1.1%',
    totalBps: 110,
    breakdown: {
      userPool: '0.5%',
      userPoolBps: 50,
      treasury: '0.6%',
      treasuryBps: 60,
    },
  },
  // Graduation fee
  graduation: {
    treasuryFee: '10%',
    treasuryFeeBps: 1000,
    liquidityDistribution: {
      pulseXV2: '10%',
      paisleyV2: '10%',
      burned: '80%',
    },
  },
  // Referral fee (from treasury portion)
  referral: {
    rate: '0.25%',
    rateBps: 25,
    note: 'Taken from treasury portion, paid to referrer',
  },
};

const CONTRACTS = {
  factory: '0x6317446972E2AcA317d7a1ef27D1412AFFcF8E27',
  treasury: '0x49bBEFa1d94702C0e9a5EAdDEc7c3C5D3eb9086B',
  bondingCurve: '0x8d487ab0c5a622d7bafc643bec09506ae3c5710b',
};

export async function GET() {
  return NextResponse.json({
    fees: FEES,
    contracts: CONTRACTS,
    airdrop: {
      schedule: 'Daily at 00:00 UTC',
      distribution: 'Top 100 traders by volume receive proportional share of user pool',
      eligibility: 'All traders who paid fees during the epoch',
    },
  });
}
