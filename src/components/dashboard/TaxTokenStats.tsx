'use client';

import React from 'react';
import { Flame, Gift, Droplets, Building2, TrendingUp, Lock, Unlock, Info } from 'lucide-react';
import { type Address, formatUnits } from 'viem';
import {
  type TaxConfig,
  type TaxTokenStats as TaxTokenStatsType,
  bpsToPercent,
  REWARD_TOKEN_INFO,
  type RewardTokenOption,
} from '@/types/taxToken';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Tax Token Stats Panel
// Displays tax configuration and lifetime distribution stats
// ═══════════════════════════════════════════════════════════════════════════

interface TaxTokenStatsProps {
  tokenAddress: Address;
  taxConfig: TaxConfig;
  stats?: Partial<TaxTokenStatsType>;
  graduated: boolean;
  tokenSymbol?: string;
  rewardTokenSymbol?: string;
}

const DISTRIBUTION_COLORS = {
  burn: '#FF6B35',      // Orange-red
  reward: '#00FF00',    // Green
  liquidity: '#00D4FF', // Cyan
  treasury: '#FFD700',  // Gold
  buyback: '#FF00FF',   // Magenta
};

export function TaxTokenStats({
  tokenAddress,
  taxConfig,
  stats,
  graduated,
  tokenSymbol = 'TOKEN',
  rewardTokenSymbol,
}: TaxTokenStatsProps) {
  // Get reward token display info
  const getRewardTokenInfo = () => {
    const rewardAddr = taxConfig.rewardToken?.toLowerCase();
    for (const [key, addr] of Object.entries(
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      require('@/types/taxToken').REWARD_TOKEN_ADDRESSES
    )) {
      if ((addr as string).toLowerCase() === rewardAddr) {
        return REWARD_TOKEN_INFO[key as RewardTokenOption];
      }
    }
    return { name: 'Custom', symbol: rewardTokenSymbol || 'TOKEN', icon: '🪙' };
  };

  const rewardInfo = getRewardTokenInfo();

  // Calculate distribution percentages for visual bar
  const distributions = [
    { key: 'burn', label: 'Burn', value: taxConfig.burnShare, color: DISTRIBUTION_COLORS.burn, icon: <Flame size={12} /> },
    { key: 'reward', label: 'Rewards', value: taxConfig.rewardShare, color: DISTRIBUTION_COLORS.reward, icon: <Gift size={12} /> },
    { key: 'liquidity', label: 'Liquidity', value: taxConfig.liquidityShare, color: DISTRIBUTION_COLORS.liquidity, icon: <Droplets size={12} /> },
    { key: 'treasury', label: 'Treasury', value: taxConfig.treasuryShare, color: DISTRIBUTION_COLORS.treasury, icon: <Building2 size={12} /> },
    { key: 'buyback', label: 'Buyback', value: taxConfig.buybackShare, color: DISTRIBUTION_COLORS.buyback, icon: <TrendingUp size={12} /> },
  ].filter((d) => d.value > 0);

  return (
    <div className="bg-gradient-to-br from-gray-900 to-black border border-[#d6ffe0]/20 rounded-xl p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-[#d6ffe0]/20 flex items-center justify-center">
            <Gift size={16} className="text-[#d6ffe0]" />
          </div>
          <div>
            <h3 className="font-mono text-sm font-bold text-[#d6ffe0]">TAX TOKENOMICS</h3>
            <p className="text-[10px] text-gray-500">Fee-on-Transfer Configuration</p>
          </div>
        </div>
        {/* Tax Status Badge */}
        <div className="flex items-center gap-2">
          {taxConfig.taxLocked ? (
            <span className="flex items-center gap-1 px-2 py-1 bg-[#d6ffe0]/20 text-[#d6ffe0] text-[10px] font-mono rounded-full">
              <Lock size={10} /> LOCKED
            </span>
          ) : (
            <span className="flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-400 text-[10px] font-mono rounded-full">
              <Unlock size={10} /> ADJUSTABLE
            </span>
          )}
        </div>
      </div>

      {/* Tax Status Banner */}
      {!graduated && (
        <div className="mb-4 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <Info size={14} className="text-orange-400" />
            <span className="text-xs text-orange-300 font-mono">
              Taxes activate after graduation
            </span>
          </div>
        </div>
      )}

      {/* Tax Rates */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="p-3 bg-black/50 rounded-lg border border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Buy Tax</div>
          <div className="text-xl font-bold text-[#d6ffe0] font-mono">
            {bpsToPercent(taxConfig.buyTaxBps)}
          </div>
        </div>
        <div className="p-3 bg-black/50 rounded-lg border border-gray-800">
          <div className="text-[10px] text-gray-500 uppercase mb-1">Sell Tax</div>
          <div className="text-xl font-bold text-[#d6ffe0] font-mono">
            {bpsToPercent(taxConfig.sellTaxBps)}
          </div>
        </div>
      </div>

      {/* Distribution Bar */}
      <div className="mb-4">
        <div className="text-[10px] text-gray-500 uppercase mb-2">Tax Distribution</div>
        <div className="h-4 bg-gray-900 rounded-full overflow-hidden flex">
          {distributions.map((d) => (
            <div
              key={d.key}
              className="h-full transition-all duration-500"
              style={{
                width: `${d.value}%`,
                backgroundColor: d.color,
              }}
              title={`${d.label}: ${d.value}%`}
            />
          ))}
        </div>
        {/* Distribution Legend */}
        <div className="flex flex-wrap gap-3 mt-2">
          {distributions.map((d) => (
            <div key={d.key} className="flex items-center gap-1">
              <div
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: d.color }}
              />
              <span className="text-[10px] text-gray-400 font-mono">
                {d.icon} {d.label}: {d.value}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Reward Token */}
      <div className="p-3 bg-black/50 rounded-lg border border-gray-800 mb-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] text-gray-500 uppercase mb-1">Reward Token</div>
            <div className="flex items-center gap-2">
              <span className="text-lg">{rewardInfo.icon}</span>
              <span className="font-mono text-white">{rewardInfo.symbol}</span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-gray-500 uppercase mb-1">Type</div>
            <span className="text-xs text-gray-300">{rewardInfo.name}</span>
          </div>
        </div>
      </div>

      {/* Lifetime Stats */}
      {stats && (
        <div className="space-y-2">
          <div className="text-[10px] text-gray-500 uppercase mb-2">Lifetime Stats</div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            {stats.totalTaxCollected !== undefined && (
              <div className="p-2 bg-black/30 rounded border border-gray-800">
                <div className="text-[10px] text-gray-500">Total Collected</div>
                <div className="font-mono text-white">
                  {Number(formatUnits(stats.totalTaxCollected, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}{' '}
                  {tokenSymbol}
                </div>
              </div>
            )}

            {stats.totalBurned !== undefined && (
              <div className="p-2 bg-black/30 rounded border border-gray-800">
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Flame size={10} className="text-orange-400" /> Burned
                </div>
                <div className="font-mono text-orange-400">
                  {Number(formatUnits(stats.totalBurned, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            )}

            {stats.totalRewardsDistributed !== undefined && (
              <div className="p-2 bg-black/30 rounded border border-gray-800">
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Gift size={10} className="text-[#d6ffe0]" /> Rewards Paid
                </div>
                <div className="font-mono text-[#d6ffe0]">
                  {Number(formatUnits(stats.totalRewardsDistributed, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            )}

            {stats.totalLiquidityAdded !== undefined && (
              <div className="p-2 bg-black/30 rounded border border-gray-800">
                <div className="text-[10px] text-gray-500 flex items-center gap-1">
                  <Droplets size={10} className="text-cyan-400" /> LP Added
                </div>
                <div className="font-mono text-cyan-400">
                  {Number(formatUnits(stats.totalLiquidityAdded, 18)).toLocaleString(undefined, {
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default TaxTokenStats;
