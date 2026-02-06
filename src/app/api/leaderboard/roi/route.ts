import { NextResponse } from 'next/server';

// ROI leaderboard - placeholder until we have tracking
export async function GET() {
  return NextResponse.json({
    leaderboard: [],
  });
}
