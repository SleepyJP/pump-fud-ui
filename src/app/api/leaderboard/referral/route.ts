import { NextResponse } from 'next/server';

// Referral leaderboard - placeholder until we have tracking
export async function GET() {
  return NextResponse.json({
    leaderboard: [],
    referralBps: 25, // 0.25%
  });
}
