'use client';

import React from 'react';
import { Zap, Gift, Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - Token Type Selector
// Choose between Standard Meme Token or Tax Token
// ═══════════════════════════════════════════════════════════════════════════

type TokenType = 'standard' | 'tax';

interface TokenTypeSelectorProps {
  selected: TokenType;
  onSelect: (type: TokenType) => void;
}

export function TokenTypeSelector({ selected, onSelect }: TokenTypeSelectorProps) {
  return (
    <div className="grid grid-cols-2 gap-4">
      {/* Standard Token */}
      <button
        onClick={() => onSelect('standard')}
        className={`relative p-5 rounded-xl border-2 text-left transition-all ${
          selected === 'standard'
            ? 'bg-blue-500/10 border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.2)]'
            : 'bg-black/40 border-gray-700 hover:border-gray-500'
        }`}
      >
        {selected === 'standard' && (
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-blue-500 flex items-center justify-center">
            <Check size={12} className="text-white" />
          </div>
        )}

        <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center mb-4">
          <Zap size={24} className="text-blue-400" />
        </div>

        <h3 className="font-bold text-white text-lg mb-2">Standard Token</h3>

        <ul className="space-y-1.5 text-sm text-gray-400 mb-4">
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span> No transfer tax
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span> Simple & clean
          </li>
          <li className="flex items-center gap-2">
            <span className="text-blue-400">•</span> Classic meme token
          </li>
        </ul>

        <div className="pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">Launch Fee</span>
          <p className="text-lg font-bold text-blue-400 font-mono">100,000 PLS</p>
        </div>
      </button>

      {/* Tax Token */}
      <button
        onClick={() => onSelect('tax')}
        className={`relative p-5 rounded-xl border-2 text-left transition-all ${
          selected === 'tax'
            ? 'bg-purple-500/10 border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.2)]'
            : 'bg-black/40 border-gray-700 hover:border-gray-500'
        }`}
      >
        {selected === 'tax' && (
          <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-purple-500 flex items-center justify-center">
            <Check size={12} className="text-white" />
          </div>
        )}

        {/* Premium Badge */}
        <div className="absolute top-3 left-3 px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full">
          <span className="text-[10px] font-bold text-white tracking-wider">PREMIUM</span>
        </div>

        <div className="w-12 h-12 rounded-xl bg-purple-500/20 flex items-center justify-center mb-4 mt-2">
          <Gift size={24} className="text-purple-400" />
        </div>

        <h3 className="font-bold text-white text-lg mb-2">Tax Token</h3>

        <ul className="space-y-1.5 text-sm text-gray-400 mb-4">
          <li className="flex items-center gap-2">
            <span className="text-purple-400">•</span> Configurable buy/sell tax
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">•</span> Holder rewards
          </li>
          <li className="flex items-center gap-2">
            <span className="text-purple-400">•</span> Auto-burn & LP
          </li>
        </ul>

        <div className="pt-3 border-t border-gray-700">
          <span className="text-xs text-gray-500">Launch Fee</span>
          <p className="text-lg font-bold text-purple-400 font-mono">250,000 PLS</p>
        </div>
      </button>
    </div>
  );
}

export default TokenTypeSelector;
