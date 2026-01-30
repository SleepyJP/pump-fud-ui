'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useReadContract } from 'wagmi';
import { TOKEN_ABI } from '@/config/abis';
import { CONSTANTS } from '@/config/wagmi';
import { X, Gift, Flame, Copy, Check, ExternalLink, Twitter, Send, Globe } from 'lucide-react';

// Component imports
import { TokenImageInfo } from './TokenImageInfo';
import { PriceChart } from './PriceChart';
import { TradePanel } from './TradePanel';
import { TransactionFeed } from './TransactionFeed';
import { LiveChat } from './LiveChat';
import { MessageBoard } from './MessageBoard';
import { HoldersPanel } from './HoldersPanel';

// ═══════════════════════════════════════════════════════════════════════════════
// DEXSCREENER-STYLE LAYOUT - CLEAN AND FUNCTIONAL
// ═══════════════════════════════════════════════════════════════════════════════
// ┌──────────────┬──────────────────────────────────────┬─────────────────┐
// │              │                                      │                 │
// │   TOKEN      │                                      │                 │
// │   IMAGE      │                                      │     TRADE       │
// │              │              CHART                   │     PANEL       │
// ├──────────────┤              (BIG)                   │                 │
// │ DESCRIPTION  │                                      │                 │
// ├──────────────┼──────────────────────────────────────┤                 │
// │ CHAT │ BOARD │        TRANSACTIONS                  │                 │
// └──────┴───────┴──────────────────────────────────────┴─────────────────┘
// ═══════════════════════════════════════════════════════════════════════════════

interface TokenDashboardProps {
  tokenAddress: `0x${string}`;
  tokenName?: string;
  tokenSymbol?: string;
}

export function TokenDashboard({ tokenAddress }: TokenDashboardProps) {
  const [mounted, setMounted] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [copied, setCopied] = useState(false);

  // Get token name
  const { data: name } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'name',
    query: { enabled: !!tokenAddress },
  });

  // Get token symbol for display
  const { data: symbol } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'symbol',
    query: { enabled: !!tokenAddress },
  });

  // Get description
  const { data: descriptionRaw } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'description',
    query: { enabled: !!tokenAddress },
  });

  // Get creator
  const { data: creator } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'creator',
    query: { enabled: !!tokenAddress },
  });

  // Get total supply
  const { data: totalSupply } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'totalSupply',
    query: { enabled: !!tokenAddress },
  });

  // Get graduation status
  const { data: graduated } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'graduated',
    query: { enabled: !!tokenAddress },
  });

  // Get PLS reserve for bonding progress
  const { data: plsReserve } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'plsReserve',
    query: { enabled: !!tokenAddress },
  });

  // Bonding progress calculation
  const GRADUATION_THRESHOLD = CONSTANTS.GRADUATION_THRESHOLD;
  const bondingProgress = plsReserve
    ? Math.min(100, Number((plsReserve as bigint) * 100n / GRADUATION_THRESHOLD))
    : 0;

  const description = useMemo(() => {
    if (!descriptionRaw) return '';
    try {
      const parsed = JSON.parse(descriptionRaw as string);
      return parsed.description || '';
    } catch {
      return descriptionRaw as string;
    }
  }, [descriptionRaw]);

  // Parse socials from description
  const socials = useMemo(() => {
    if (!descriptionRaw) return null;
    try {
      const parsed = JSON.parse(descriptionRaw as string);
      return parsed.socials || null;
    } catch {
      return null;
    }
  }, [descriptionRaw]);

  const copyAddress = () => {
    navigator.clipboard.writeText(tokenAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const formatAddress = (addr: string): string => {
    return addr.slice(0, 6) + '...' + addr.slice(-4);
  };

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-[#d6ffe0]/30 border-t-[#d6ffe0] rounded-full animate-spin" />
          <div className="animate-pulse text-[#d6ffe0] font-mono text-sm">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-black text-white flex flex-col overflow-hidden">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* FEE SHARING BANNER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showBanner && (
        <div className="bg-gradient-to-r from-[#d6ffe0]/20 to-purple-500/20 border-b border-[#d6ffe0]/30 px-4 py-2 flex items-center justify-center gap-3">
          <Gift size={16} className="text-[#d6ffe0]" />
          <span className="text-sm font-mono text-white">
            <span className="text-[#d6ffe0] font-bold">Earn 50%</span> of all trading fees — airdropped daily to token holders!
          </span>
          <button
            onClick={() => setShowBanner(false)}
            className="ml-4 text-gray-400 hover:text-white"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* MAIN CONTENT - 3 Columns */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex flex-1 min-h-0">

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* LEFT COLUMN - Image + Description + Chat/Board */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-72 flex-shrink-0 border-r border-gray-800 flex flex-col">
          {/* Token Image - Takes most space */}
          <div className="h-64 flex-shrink-0 border-b border-gray-800">
            <TokenImageInfo tokenAddress={tokenAddress} />
          </div>

          {/* Description - Compact */}
          {description && (
            <div className="p-3 border-b border-gray-800 bg-black">
              <h3 className="text-[10px] text-gray-500 uppercase mb-1">About</h3>
              <p className="text-xs text-gray-300 leading-relaxed line-clamp-4">
                {description}
              </p>
            </div>
          )}

          {/* Chat + Board - Small, for future */}
          <div className="flex-1 flex flex-col min-h-0">
            <div className="flex-1 min-h-[120px] border-b border-gray-800 overflow-hidden">
              <LiveChat tokenAddress={tokenAddress} />
            </div>
            <div className="flex-1 min-h-[120px] overflow-hidden">
              <MessageBoard tokenAddress={tokenAddress} />
            </div>
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* CENTER COLUMN - Chart (BIG) + Transactions */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="flex-1 min-w-0 flex flex-col border-r border-gray-800">
          {/* Chart - Takes 70% of center column */}
          <div className="flex-[7] min-h-0">
            <PriceChart tokenAddress={tokenAddress} />
          </div>

          {/* Transactions - Takes 30% */}
          <div className="flex-[3] min-h-0 border-t border-gray-800">
            <TransactionFeed tokenAddress={tokenAddress} tokenSymbol={(symbol as string) || 'TOKEN'} />
          </div>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* RIGHT COLUMN - Token Info + Trade Panel + Holders */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div className="w-80 flex-shrink-0 flex flex-col">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* TOKEN INFO BAR - Name, Symbol, Status, Contract, Socials */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          <div className="p-3 border-b border-gray-800 bg-black/50">
            {/* Name & Symbol */}
            <div className="flex items-center justify-between mb-2">
              <div>
                <h2 className="text-[#d6ffe0] font-bold text-lg">{(name as string) || '...'}</h2>
                <span className="text-gray-400 text-xs font-mono">${(symbol as string) || '...'}</span>
              </div>
              {/* Status Badge */}
              {graduated ? (
                <div className="px-2 py-1 bg-[#d6ffe0]/90 text-black text-[10px] font-black rounded">
                  ✓ GRADUATED
                </div>
              ) : (
                <div className="px-2 py-1 bg-orange-500/90 text-black text-[10px] font-black rounded flex items-center gap-1">
                  <Flame size={10} /> {bondingProgress.toFixed(0)}%
                </div>
              )}
            </div>

            {/* Contract Address */}
            <button
              onClick={copyAddress}
              className="flex items-center gap-2 w-full px-2 py-1.5 bg-gray-900 rounded text-xs font-mono text-[#d6ffe0] hover:bg-gray-800 mb-2"
            >
              {formatAddress(tokenAddress)}
              {copied ? <Check size={10} /> : <Copy size={10} />}
              <a
                href={`https://scan.pulsechain.com/token/${tokenAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-auto text-gray-400 hover:text-[#d6ffe0]"
                onClick={(e) => e.stopPropagation()}
              >
                <ExternalLink size={10} />
              </a>
            </button>

            {/* Socials */}
            {socials && (socials.twitter || socials.telegram || socials.website) && (
              <div className="flex gap-1">
                {socials.twitter && (
                  <a href={socials.twitter} target="_blank" rel="noopener noreferrer"
                     className="p-1.5 bg-gray-900 rounded text-gray-400 hover:text-[#d6ffe0]">
                    <Twitter size={12} />
                  </a>
                )}
                {socials.telegram && (
                  <a href={socials.telegram} target="_blank" rel="noopener noreferrer"
                     className="p-1.5 bg-gray-900 rounded text-gray-400 hover:text-[#d6ffe0]">
                    <Send size={12} />
                  </a>
                )}
                {socials.website && (
                  <a href={socials.website} target="_blank" rel="noopener noreferrer"
                     className="p-1.5 bg-gray-900 rounded text-gray-400 hover:text-[#d6ffe0]">
                    <Globe size={12} />
                  </a>
                )}
              </div>
            )}
          </div>

          {/* Trade Panel - Main focus */}
          <div className="flex-[3] min-h-0 overflow-y-auto border-b border-gray-800">
            <TradePanel tokenAddress={tokenAddress} tokenSymbol={(symbol as string) || 'TOKEN'} />
          </div>
          {/* Holders - Shorter */}
          <div className="flex-[2] min-h-0 overflow-y-auto">
            <HoldersPanel
              tokenAddress={tokenAddress}
              tokenSymbol={(symbol as string) || 'TOKEN'}
              totalSupply={totalSupply as bigint}
              creator={creator as `0x${string}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default TokenDashboard;
