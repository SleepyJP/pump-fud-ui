'use client';

import React, { useState, useEffect } from 'react';
import { Flame, Gift, Droplets, Building2, TrendingUp, Lock, Unlock, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import {
  type TaxConfig,
  type RewardTokenOption,
  REWARD_TOKEN_ADDRESSES,
  REWARD_TOKEN_INFO,
  DEFAULT_TAX_CONFIG,
  validateTaxShares,
} from '@/types/taxToken';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Tax Configuration Panel
// Configure fee-on-transfer taxes during token creation
// ═══════════════════════════════════════════════════════════════════════════

interface TaxConfigPanelProps {
  config: TaxConfig;
  onChange: (config: TaxConfig) => void;
  disabled?: boolean;
}

const DISTRIBUTION_ITEMS = [
  { key: 'burnShare', label: 'Burn', icon: <Flame size={14} />, color: '#FF6B35', description: 'Tokens burned forever' },
  { key: 'rewardShare', label: 'Holder Rewards', icon: <Gift size={14} />, color: '#00FF00', description: 'Distributed to token holders' },
  { key: 'liquidityShare', label: 'Auto-Liquidity', icon: <Droplets size={14} />, color: '#00D4FF', description: 'Added to LP and locked' },
  { key: 'treasuryShare', label: 'Treasury', icon: <Building2 size={14} />, color: '#FFD700', description: 'Platform fee (min 10%)' },
  { key: 'buybackShare', label: 'Buyback & Burn', icon: <TrendingUp size={14} />, color: '#FF00FF', description: 'Buy tokens and burn them' },
] as const;

const REWARD_TOKEN_OPTIONS: { value: RewardTokenOption; label: string; icon: string }[] = [
  { value: 'PLS', label: 'PLS (Native)', icon: '💚' },
  { value: 'WPLS', label: 'Wrapped PLS', icon: '🟢' },
  { value: 'HEX', label: 'HEX', icon: '🔶' },
  { value: 'PLSX', label: 'PulseX', icon: '🔷' },
  { value: 'INC', label: 'Incentive', icon: '💎' },
  { value: 'SELF', label: 'Self (Reflection)', icon: '🔄' },
];

export function TaxConfigPanel({ config, onChange, disabled = false }: TaxConfigPanelProps) {
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [selectedRewardToken, setSelectedRewardToken] = useState<RewardTokenOption>('PLS');

  // Validate shares
  const { valid: sharesValid, total: sharesTotal } = validateTaxShares(config);

  // Update a single field
  const updateField = <K extends keyof TaxConfig>(key: K, value: TaxConfig[K]) => {
    if (disabled) return;
    onChange({ ...config, [key]: value });
  };

  // Update tax rate (convert from % to bps)
  const updateTaxRate = (key: 'buyTaxBps' | 'sellTaxBps', percentValue: number) => {
    const bps = Math.min(1000, Math.max(0, Math.round(percentValue * 100)));
    updateField(key, bps);
  };

  // Update distribution share
  const updateShare = (key: keyof TaxConfig, value: number) => {
    const clampedValue = Math.min(100, Math.max(0, value));
    // Treasury minimum 10%
    if (key === 'treasuryShare' && clampedValue < 10) {
      updateField(key, 10);
      return;
    }
    updateField(key, clampedValue);
  };

  // Handle reward token selection
  const handleRewardTokenChange = (option: RewardTokenOption) => {
    setSelectedRewardToken(option);
    updateField('rewardToken', REWARD_TOKEN_ADDRESSES[option]);
  };

  // Quick presets
  const applyPreset = (preset: 'balanced' | 'burn' | 'rewards' | 'growth') => {
    const presets: Record<string, Partial<TaxConfig>> = {
      balanced: { burnShare: 20, rewardShare: 30, liquidityShare: 20, treasuryShare: 20, buybackShare: 10 },
      burn: { burnShare: 50, rewardShare: 20, liquidityShare: 10, treasuryShare: 10, buybackShare: 10 },
      rewards: { burnShare: 10, rewardShare: 50, liquidityShare: 10, treasuryShare: 20, buybackShare: 10 },
      growth: { burnShare: 10, rewardShare: 20, liquidityShare: 40, treasuryShare: 20, buybackShare: 10 },
    };
    onChange({ ...config, ...presets[preset] });
  };

  return (
    <div className="bg-gradient-to-br from-purple-900/20 to-black border border-purple-500/30 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center gap-3 mb-5 pb-4 border-b border-purple-500/20">
        <div className="w-10 h-10 rounded-xl bg-purple-500/20 flex items-center justify-center">
          <Gift size={20} className="text-purple-400" />
        </div>
        <div>
          <h3 className="font-bold text-white text-lg">Tax Token Configuration</h3>
          <p className="text-xs text-gray-500">Configure fee-on-transfer tokenomics</p>
        </div>
      </div>

      {/* Tax Rates */}
      <div className="mb-6">
        <label className="block text-xs text-purple-400 uppercase tracking-wider mb-3">
          Tax Rates (Max 10% each)
        </label>
        <div className="grid grid-cols-2 gap-4">
          {/* Buy Tax */}
          <div className="p-4 bg-black/40 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Buy Tax</span>
              <span className="text-lg font-bold text-green-400 font-mono">
                {(config.buyTaxBps / 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={config.buyTaxBps / 100}
              onChange={(e) => updateTaxRate('buyTaxBps', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-green-500"
            />
          </div>

          {/* Sell Tax */}
          <div className="p-4 bg-black/40 rounded-lg border border-gray-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Sell Tax</span>
              <span className="text-lg font-bold text-red-400 font-mono">
                {(config.sellTaxBps / 100).toFixed(1)}%
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="10"
              step="0.5"
              value={config.sellTaxBps / 100}
              onChange={(e) => updateTaxRate('sellTaxBps', parseFloat(e.target.value))}
              disabled={disabled}
              className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-red-500"
            />
          </div>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="mb-6">
        <label className="block text-xs text-purple-400 uppercase tracking-wider mb-3">
          Quick Presets
        </label>
        <div className="grid grid-cols-4 gap-2">
          {[
            { id: 'balanced', label: '⚖️ Balanced' },
            { id: 'burn', label: '🔥 Burn Heavy' },
            { id: 'rewards', label: '💰 Rewards' },
            { id: 'growth', label: '📈 Growth' },
          ].map((preset) => (
            <button
              key={preset.id}
              onClick={() => applyPreset(preset.id as any)}
              disabled={disabled}
              className="py-2 px-3 bg-gray-800/50 hover:bg-purple-500/20 border border-gray-700 hover:border-purple-500/50 rounded-lg text-xs text-gray-300 hover:text-white transition-all disabled:opacity-50"
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tax Distribution */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <label className="text-xs text-purple-400 uppercase tracking-wider">
            Tax Distribution
          </label>
          <span className={`text-xs font-mono ${sharesValid ? 'text-green-400' : 'text-red-400'}`}>
            {sharesTotal}% / 100%
          </span>
        </div>

        {/* Visual Bar */}
        <div className="h-4 bg-gray-900 rounded-full overflow-hidden flex mb-4">
          {DISTRIBUTION_ITEMS.map((item) => {
            const value = config[item.key as keyof TaxConfig] as number;
            if (value <= 0) return null;
            return (
              <div
                key={item.key}
                className="h-full transition-all duration-300"
                style={{ width: `${value}%`, backgroundColor: item.color }}
                title={`${item.label}: ${value}%`}
              />
            );
          })}
        </div>

        {/* Distribution Inputs */}
        <div className="space-y-3">
          {DISTRIBUTION_ITEMS.map((item) => {
            const value = config[item.key as keyof TaxConfig] as number;
            const isMinTreasury = item.key === 'treasuryShare' && value <= 10;

            return (
              <div
                key={item.key}
                className="flex items-center gap-3 p-3 bg-black/30 rounded-lg border border-gray-800"
              >
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${item.color}20` }}>
                  <span style={{ color: item.color }}>{item.icon}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-white">{item.label}</span>
                    {isMinTreasury && (
                      <span className="text-[10px] text-yellow-500 bg-yellow-500/10 px-1.5 py-0.5 rounded">MIN</span>
                    )}
                  </div>
                  <span className="text-[10px] text-gray-500">{item.description}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min={item.key === 'treasuryShare' ? 10 : 0}
                    max={100}
                    value={value}
                    onChange={(e) => updateShare(item.key as keyof TaxConfig, parseInt(e.target.value) || 0)}
                    disabled={disabled}
                    className="w-16 px-2 py-1.5 bg-gray-900 border border-gray-700 rounded text-right text-sm font-mono text-white focus:border-purple-500 focus:outline-none disabled:opacity-50"
                  />
                  <span className="text-xs text-gray-500">%</span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Validation Warning */}
        {!sharesValid && (
          <div className="mt-3 p-3 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-2">
            <AlertCircle size={14} className="text-red-400" />
            <span className="text-xs text-red-300">
              Distribution must equal 100% (currently {sharesTotal}%)
            </span>
          </div>
        )}
      </div>

      {/* Reward Token Selection */}
      <div className="mb-6">
        <label className="block text-xs text-purple-400 uppercase tracking-wider mb-3">
          Reward Token
        </label>
        <div className="grid grid-cols-3 gap-2">
          {REWARD_TOKEN_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => handleRewardTokenChange(option.value)}
              disabled={disabled}
              className={`p-3 rounded-lg border text-left transition-all ${
                selectedRewardToken === option.value
                  ? 'bg-purple-500/20 border-purple-500/50 text-white'
                  : 'bg-gray-900/50 border-gray-800 text-gray-400 hover:border-gray-600'
              } disabled:opacity-50`}
            >
              <span className="text-lg">{option.icon}</span>
              <span className="block text-xs mt-1">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Options */}
      <div className="border-t border-gray-800 pt-4">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors"
        >
          {showAdvanced ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          Advanced Options
        </button>

        {showAdvanced && (
          <div className="mt-4 space-y-4">
            {/* Lock Tax Rates */}
            <div className="flex items-center justify-between p-3 bg-black/30 rounded-lg border border-gray-800">
              <div className="flex items-center gap-3">
                {config.taxLocked ? (
                  <Lock size={16} className="text-yellow-400" />
                ) : (
                  <Unlock size={16} className="text-gray-500" />
                )}
                <div>
                  <span className="text-sm text-white">Lock Tax Rates</span>
                  <p className="text-[10px] text-gray-500">Once locked, rates can never be increased</p>
                </div>
              </div>
              <button
                onClick={() => updateField('taxLocked', !config.taxLocked)}
                disabled={disabled}
                className={`w-12 h-6 rounded-full transition-all ${
                  config.taxLocked ? 'bg-yellow-500' : 'bg-gray-700'
                } disabled:opacity-50`}
              >
                <div
                  className={`w-5 h-5 bg-white rounded-full shadow transition-transform ${
                    config.taxLocked ? 'translate-x-6' : 'translate-x-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Info Banner */}
      <div className="mt-5 p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
        <p className="text-xs text-purple-300">
          <strong>Note:</strong> Taxes are disabled during bonding curve phase and activate after graduation to DEX.
        </p>
      </div>
    </div>
  );
}

export default TaxConfigPanel;
