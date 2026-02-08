'use client';

import { useWFudData } from '@/hooks/useWFudData';
import { WFUD_ADDRESS } from '@/config/wfudAbi';
import { WFudHero } from './WFudHero';
import { WFudStatsGrid } from './WFudStatsGrid';
import { WFudTaxBreakdown } from './WFudTaxBreakdown';
import { WFudRewardTokenGrid } from './WFudRewardTokenGrid';
import { WFudUserPosition } from './WFudUserPosition';
import { WFudHolderLeaderboard } from './WFudHolderLeaderboard';
import { DexScreenerChart } from '@/components/dashboard/DexScreenerChart';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - wFUD Dashboard
// Dedicated showcase for the wFUD ForgedTaxTokenV3 rewarder token
// ═══════════════════════════════════════════════════════════════════════════

export function WFudDashboard() {
  const data = useWFudData();

  return (
    <div className="min-h-screen bg-dark-bg pb-12">
      <div className="max-w-screen-2xl mx-auto px-4">
        {/* Hero - full width */}
        <div className="mb-6">
          <WFudHero />
        </div>

        {/* Two-column layout */}
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          {/* ═══════════ LEFT COLUMN ═══════════ */}
          <div className="space-y-6">
            <WFudStatsGrid
              totalSupply={data.totalSupply}
              holderCount={data.holderCount}
              totalReflected={data.totalReflected}
              tradingEnabled={data.tradingEnabled}
              isLoading={data.isLoading}
            />

            <WFudTaxBreakdown
              buyTax={data.buyTax}
              sellTax={data.sellTax}
              transferTax={data.transferTax}
              treasuryShare={data.treasuryShare}
              burnShare={data.burnShare}
              reflectionShare={data.reflectionShare}
              liquidityShare={data.liquidityShare}
              yieldShare={data.yieldShare}
              supportShare={data.supportShare}
              isLoading={data.isLoading}
            />

            <WFudRewardTokenGrid
              yieldTokens={data.yieldTokens}
              isLoading={data.isLoading}
            />

            <WFudUserPosition
              userBalance={data.userBalance}
              userPercent={data.userPercent}
              pendingRewards={data.pendingRewards}
              isLoading={data.isLoadingUser}
            />
          </div>

          {/* ═══════════ RIGHT COLUMN ═══════════ */}
          <div className="space-y-6">
            {/* DEXScreener Chart */}
            <div className="rounded-lg overflow-hidden border border-border-primary bg-dark-card" style={{ minHeight: '450px' }}>
              <DexScreenerChart
                tokenAddress={WFUD_ADDRESS}
                pairAddress={data.pairAddress || undefined}
                graduated={true}
                className="w-full h-full"
              />
            </div>

            {/* Holder Leaderboard */}
            <WFudHolderLeaderboard
              holders={data.holders}
              isLoading={data.isLoadingHolders}
              holderCount={data.holderCount}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WFudDashboard;
