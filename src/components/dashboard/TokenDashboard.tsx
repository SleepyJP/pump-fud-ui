'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useReadContract, useAccount } from 'wagmi';
import { TOKEN_ABI } from '@/config/abis';
import { CONSTANTS } from '@/config/wagmi';
import { X, Gift, Flame, Copy, Check, ExternalLink, Twitter, Send, Globe, MessageCircle, Clipboard, Maximize2, Minimize2, BarChart3 } from 'lucide-react';

// Component imports
import { TokenImageInfo } from './TokenImageInfo';
import { PriceChart } from './PriceChart';
import { TradePanel } from './TradePanel';
import { TransactionFeed } from './TransactionFeed';
import { LiveChat } from './LiveChat';
import { MessageBoard } from './MessageBoard';
import { HoldersPanel } from './HoldersPanel';
import { TaxTokenStats } from './TaxTokenStats';
import { RewardsClaimPanel } from './RewardsClaimPanel';
import { useTaxTokenData } from '@/hooks/useTaxTokenData';
import { REWARD_TOKEN_INFO, type RewardTokenOption, REWARD_TOKEN_ADDRESSES } from '@/types/taxToken';

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
  const [showFullDescription, setShowFullDescription] = useState(false);
  const [expandedPanel, setExpandedPanel] = useState<'chat' | 'board' | null>(null);

  const { address: userAddress, isConnected } = useAccount();

  // Tax token data (for fee-on-transfer tokens)
  const {
    isTaxToken,
    taxConfig,
    stats: taxStats,
    pendingRewards,
    totalClaimed,
    canClaim,
    refetch: refetchRewards,
  } = useTaxTokenData(tokenAddress);

  // State for tab view (for tax tokens)
  const [activeTab, setActiveTab] = useState<'overview' | 'tax' | 'holders'>('overview');

  // Get reward token symbol
  const rewardTokenSymbol = useMemo(() => {
    if (!taxConfig?.rewardToken) return 'PLS';
    const rewardAddr = taxConfig.rewardToken.toLowerCase();
    for (const [key, addr] of Object.entries(REWARD_TOKEN_ADDRESSES)) {
      if ((addr as string).toLowerCase() === rewardAddr) {
        return REWARD_TOKEN_INFO[key as RewardTokenOption].symbol;
      }
    }
    return 'TOKEN';
  }, [taxConfig]);

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

  // Get user's token balance for 1% check
  const { data: userBalance } = useReadContract({
    address: tokenAddress,
    abi: TOKEN_ABI,
    functionName: 'balanceOf',
    args: userAddress ? [userAddress] : undefined,
    query: { enabled: !!tokenAddress && !!userAddress },
  });

  // Calculate if user holds 1% of supply
  const onePercentThreshold = totalSupply ? (totalSupply as bigint) / 100n : 0n;
  const hasOnePercent = userBalance && totalSupply && (userBalance as bigint) >= onePercentThreshold;
  const holdingPercent = userBalance && totalSupply
    ? Number((userBalance as bigint) * 10000n / (totalSupply as bigint)) / 100
    : 0;

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
      {/* PANEL CONTROL HEADER */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="px-4 py-2 border-b border-gray-800 bg-black/50 flex items-center gap-3">
        {/* Live Chat Button */}
        <button
          onClick={() => setExpandedPanel(expandedPanel === 'chat' ? null : 'chat')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
            hasOnePercent
              ? 'bg-[#d6ffe0]/20 text-[#d6ffe0] border border-[#d6ffe0]/50 shadow-[0_0_10px_rgba(214,255,224,0.3)]'
              : 'bg-gray-900 text-gray-500 border border-gray-700'
          } ${expandedPanel === 'chat' ? 'ring-2 ring-[#d6ffe0]' : ''}`}
        >
          <MessageCircle size={14} className={hasOnePercent ? 'text-[#d6ffe0]' : 'text-gray-500'} />
          LIVE CHAT
          {expandedPanel === 'chat' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>

        {/* Message Board Button */}
        <button
          onClick={() => setExpandedPanel(expandedPanel === 'board' ? null : 'board')}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
            hasOnePercent
              ? 'bg-[#d6ffe0]/20 text-[#d6ffe0] border border-[#d6ffe0]/50 shadow-[0_0_10px_rgba(214,255,224,0.3)]'
              : 'bg-gray-900 text-gray-500 border border-gray-700'
          } ${expandedPanel === 'board' ? 'ring-2 ring-[#d6ffe0]' : ''}`}
        >
          <Clipboard size={14} className={hasOnePercent ? 'text-[#d6ffe0]' : 'text-gray-500'} />
          MESSAGE BOARD
          {expandedPanel === 'board' ? <Minimize2 size={12} /> : <Maximize2 size={12} />}
        </button>

        {/* Holding Status */}
        {isConnected && (
          <span className={`ml-auto text-[10px] font-mono ${hasOnePercent ? 'text-[#d6ffe0]' : 'text-gray-500'}`}>
            {hasOnePercent
              ? `✓ ${holdingPercent.toFixed(2)}% holder - chat unlocked`
              : `${holdingPercent.toFixed(2)}% (need 1% to chat free)`
            }
          </span>
        )}
      </div>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* EXPANDED PANEL OVERLAY */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {expandedPanel && (
        <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl h-[80vh] bg-gradient-to-br from-gray-900 to-black border border-[#d6ffe0]/30 rounded-xl overflow-hidden flex flex-col">
            {/* Expanded Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#d6ffe0]/20 bg-black/50">
              <div className="flex items-center gap-2">
                {expandedPanel === 'chat' ? (
                  <MessageCircle size={18} className="text-[#d6ffe0]" />
                ) : (
                  <Clipboard size={18} className="text-[#d6ffe0]" />
                )}
                <span className="font-mono text-[#d6ffe0] font-bold">
                  {expandedPanel === 'chat' ? 'LIVE CHAT' : 'MESSAGE BOARD'}
                </span>
              </div>
              <button
                onClick={() => setExpandedPanel(null)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all"
              >
                <X size={18} />
              </button>
            </div>
            {/* Expanded Content */}
            <div className="flex-1 overflow-hidden">
              {expandedPanel === 'chat' ? (
                <LiveChat tokenAddress={tokenAddress} />
              ) : (
                <MessageBoard tokenAddress={tokenAddress} />
              )}
            </div>
          </div>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* DESCRIPTION MODAL */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {showFullDescription && description && (
        <div
          className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-8"
          onClick={() => setShowFullDescription(false)}
        >
          <div
            className="w-full max-w-lg max-h-[80vh] bg-gradient-to-br from-gray-900 to-black border border-[#d6ffe0]/30 rounded-xl overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#d6ffe0]/20 bg-black/50 flex-shrink-0">
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-[#d6ffe0] font-bold truncate">
                  {(name as string) || 'Token'} {(symbol as string) ? `($${(symbol as string).replace(/^\$+/, '')})` : ''}
                </span>
              </div>
              <button
                onClick={() => setShowFullDescription(false)}
                className="p-2 text-gray-400 hover:text-white hover:bg-gray-800 rounded-lg transition-all flex-shrink-0"
              >
                <X size={18} />
              </button>
            </div>
            {/* Modal Body */}
            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-[10px] text-gray-500 uppercase mb-2">About</h3>
              <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">
                {description}
              </p>
            </div>
          </div>
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

          {/* Description - Clickable to expand */}
          {description && (
            <div
              className="p-3 border-b border-gray-800 bg-black cursor-pointer hover:bg-gray-900/50 transition-colors group"
              onClick={() => setShowFullDescription(true)}
            >
              <div className="flex items-center justify-between mb-1">
                <h3 className="text-[10px] text-gray-500 uppercase">About</h3>
                <span className="text-[9px] text-gray-600 group-hover:text-[#d6ffe0] transition-colors">click to read</span>
              </div>
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
                <h2 className="font-display font-bold text-lg">
                  {(name as string)?.includes('PUMP') ? (
                    <>
                      <span className="text-[#d6ffe0]">PUMP</span>
                      <span className="text-white">.FUD</span>
                    </>
                  ) : (
                    <span className="text-[#d6ffe0]">{(name as string) || '...'}</span>
                  )}
                </h2>
                <span className="text-gray-400 text-xs font-mono">${((symbol as string) || '...').replace(/^\$+/, '')}</span>
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

            {/* Tax Token Badge */}
            {isTaxToken && (
              <div className="mt-2 flex items-center gap-1 px-2 py-1 bg-purple-500/20 text-purple-300 text-[10px] font-mono rounded-full w-fit">
                <Gift size={10} />
                TAX TOKEN
              </div>
            )}
          </div>

          {/* Tab Navigation for Tax Tokens */}
          {isTaxToken && (
            <div className="flex border-b border-gray-800 bg-black/30">
              <button
                onClick={() => setActiveTab('overview')}
                className={`flex-1 py-2 text-xs font-mono transition-all ${
                  activeTab === 'overview'
                    ? 'text-[#d6ffe0] border-b-2 border-[#d6ffe0]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                TRADE
              </button>
              <button
                onClick={() => setActiveTab('tax')}
                className={`flex-1 py-2 text-xs font-mono transition-all ${
                  activeTab === 'tax'
                    ? 'text-[#d6ffe0] border-b-2 border-[#d6ffe0]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                REWARDS
              </button>
              <button
                onClick={() => setActiveTab('holders')}
                className={`flex-1 py-2 text-xs font-mono transition-all ${
                  activeTab === 'holders'
                    ? 'text-[#d6ffe0] border-b-2 border-[#d6ffe0]'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                HOLDERS
              </button>
            </div>
          )}

          {/* Tab Content */}
          {isTaxToken && activeTab === 'tax' && taxConfig ? (
            <div className="flex-1 min-h-0 overflow-y-auto p-3 space-y-3">
              {/* Rewards Claim Panel */}
              <RewardsClaimPanel
                tokenAddress={tokenAddress}
                pendingRewards={pendingRewards}
                totalClaimed={totalClaimed}
                rewardTokenSymbol={rewardTokenSymbol}
                canClaim={canClaim}
                graduated={graduated as boolean}
                onClaimSuccess={refetchRewards}
              />
              {/* Tax Stats */}
              <TaxTokenStats
                tokenAddress={tokenAddress}
                taxConfig={taxConfig}
                stats={taxStats || undefined}
                graduated={graduated as boolean}
                tokenSymbol={(symbol as string) || 'TOKEN'}
                rewardTokenSymbol={rewardTokenSymbol}
              />
            </div>
          ) : isTaxToken && activeTab === 'holders' ? (
            <div className="flex-1 min-h-0 overflow-y-auto">
              <HoldersPanel
                tokenAddress={tokenAddress}
                tokenSymbol={(symbol as string) || 'TOKEN'}
                totalSupply={totalSupply as bigint}
                creator={creator as `0x${string}`}
                isTaxToken={true}
                rewardTokenSymbol={rewardTokenSymbol}
              />
            </div>
          ) : (
            <>
              {/* Trade Panel - Primary action, always visible */}
              <div className="flex-shrink-0 border-b border-gray-800">
                <TradePanel
                  tokenAddress={tokenAddress}
                  tokenSymbol={(symbol as string) || 'TOKEN'}
                  graduated={graduated as boolean ?? false}
                />
              </div>

              {/* Holders - Below Trade, Pump.Tires style, takes remaining space */}
              <div className="flex-1 min-h-0 overflow-y-auto">
                <HoldersPanel
                  tokenAddress={tokenAddress}
                  tokenSymbol={(symbol as string) || 'TOKEN'}
                  totalSupply={totalSupply as bigint}
                  creator={creator as `0x${string}`}
                  isTaxToken={isTaxToken}
                  rewardTokenSymbol={isTaxToken ? rewardTokenSymbol : undefined}
                />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default TokenDashboard;
