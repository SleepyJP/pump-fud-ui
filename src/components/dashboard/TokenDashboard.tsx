'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Layout } from 'react-grid-layout';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// Use our manual width measurement wrapper - NOT WidthProvider
import { DashboardWrapper } from './DashboardWrapper';
import { DashboardPanel } from './DashboardPanel';

// Component imports
import { TokenImageInfo } from './TokenImageInfo';
import { MessageBoard } from './MessageBoard';
import { LiveChat } from './LiveChat';
import { PriceChart } from './PriceChart';
import { BuySellsTable } from './BuySellsTable';
import { SwapWidget } from './SwapWidget';
import { HoldersList } from './HoldersList';

// ═══════════════════════════════════════════════════════════════════════════════
// LAYOUT SPECIFICATION - UPDATED PER USER REQUEST
// ═══════════════════════════════════════════════════════════════════════════════
// ┌─────────────────────┬───────────────────────────────────┬─────────────┐
// │                     │                                   │             │
// │   TOKEN IMAGE       │                                   │             │
// │   (BIG)             │                                   │             │
// │                     │                                   │   SWAP      │
// │   + DESCRIPTION     │            CHART                  │   WIDGET    │
// │   + ALL INFO        │           (HUGE)                  │   (FULL     │
// │   + SOCIALS         │                                   │   HEIGHT)   │
// │                     │                                   │             │
// │                     │                                   │             │
// ├──────────┬──────────┼───────────────────────────────────┤             │
// │ MESSAGE  │  LIVE    │       BUYS & SELLS TABLE          │             │
// │ BOARD    │  CHAT    │                                   │             │
// │ (small)  │ (small)  │                                   │             │
// └──────────┴──────────┴───────────────────────────────────┴─────────────┘
// ═══════════════════════════════════════════════════════════════════════════════

const DEFAULT_LAYOUT: Layout[] = [
  // LEFT COLUMN - Token image + description (BIG) takes top
  { i: 'image-info', x: 0, y: 0, w: 6, h: 18, minW: 5, minH: 12, maxW: 8, maxH: 24 },
  // LEFT BOTTOM - Live chat + Message board split side by side
  { i: 'live-chat', x: 0, y: 18, w: 3, h: 10, minW: 2, minH: 6, maxW: 6, maxH: 14 },
  { i: 'message-board', x: 3, y: 18, w: 3, h: 10, minW: 2, minH: 6, maxW: 6, maxH: 14 },

  // CENTER COLUMN - Chart (huge) + Transactions below
  { i: 'chart', x: 6, y: 0, w: 12, h: 18, minW: 8, minH: 12, maxW: 16, maxH: 24 },
  { i: 'transactions', x: 6, y: 18, w: 12, h: 10, minW: 6, minH: 6, maxW: 16, maxH: 14 },

  // RIGHT COLUMN - Swap (2/3 height), Holders (1/3 height)
  { i: 'swap', x: 18, y: 0, w: 6, h: 19, minW: 5, minH: 14, maxW: 8, maxH: 26 },
  { i: 'holders', x: 18, y: 19, w: 6, h: 9, minW: 4, minH: 6, maxW: 8, maxH: 14 },
];

const STORAGE_KEY_PREFIX = 'pump-fud-dashboard-layout-';

interface TokenDashboardProps {
  tokenAddress: `0x${string}`;
  tokenName?: string;
  tokenSymbol?: string;
  imageUri?: string;
  description?: string;
  creator?: `0x${string}`;
  socials?: { twitter?: string; telegram?: string; website?: string };
  currentPrice?: bigint;
  totalSupply?: bigint;
  plsReserve?: bigint;
  graduated?: boolean;
}

export function TokenDashboard({
  tokenAddress,
  tokenName,
  tokenSymbol,
  imageUri,
  description,
  creator,
  socials,
  currentPrice,
  totalSupply,
  plsReserve,
  graduated,
}: TokenDashboardProps) {
  const [isLocked, setIsLocked] = useState(true);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
    lg: DEFAULT_LAYOUT,
    md: DEFAULT_LAYOUT,
    sm: DEFAULT_LAYOUT,
    xs: DEFAULT_LAYOUT,
    xxs: DEFAULT_LAYOUT,
  });
  const [mounted, setMounted] = useState(false);

  // Load layout from localStorage on mount
  useEffect(() => {
    setMounted(true);
    const storageKey = `${STORAGE_KEY_PREFIX}${tokenAddress}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        // Handle both old format (array) and new format (object with breakpoints)
        if (Array.isArray(parsed) && parsed.length === 8) {
          setLayouts({
            lg: parsed,
            md: parsed,
            sm: parsed,
            xs: parsed,
            xxs: parsed,
          });
        } else if (typeof parsed === 'object' && parsed.lg) {
          setLayouts(parsed);
        }
      }
    } catch (e) {
      console.error('[TokenDashboard] Failed to load layout:', e);
    }
  }, [tokenAddress]);

  // Handle layout change - receives both current layout and all layouts
  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      setLayouts(allLayouts);
      if (!isLocked) {
        const storageKey = `${STORAGE_KEY_PREFIX}${tokenAddress}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(allLayouts));
        } catch (e) {
          console.error('[TokenDashboard] Failed to save layout:', e);
        }
      }
    },
    [tokenAddress, isLocked]
  );

  // Reset to default layout
  const handleReset = useCallback(() => {
    if (confirm('Reset layout to default?')) {
      const defaultLayouts = {
        lg: DEFAULT_LAYOUT,
        md: DEFAULT_LAYOUT,
        sm: DEFAULT_LAYOUT,
        xs: DEFAULT_LAYOUT,
        xxs: DEFAULT_LAYOUT,
      };
      setLayouts(defaultLayouts);
      const storageKey = `${STORAGE_KEY_PREFIX}${tokenAddress}`;
      localStorage.removeItem(storageKey);
    }
  }, [tokenAddress]);

  // Don't render until client-side mounted to avoid SSR hydration issues
  if (!mounted) {
    return (
      <div className="w-full min-h-[800px]">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-[#39ff14]/30 border-t-[#39ff14] rounded-full animate-spin" />
            <div className="animate-pulse text-[#39ff14] font-mono text-sm">Initializing dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full">
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* TOOLBAR - Lock/Unlock Controls */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <div className="flex items-center justify-end gap-2 mb-3 px-4">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all border ${
            isLocked
              ? 'bg-black/60 border-gray-700 text-gray-400 hover:border-[#39ff14]/50 hover:text-[#39ff14]'
              : 'bg-[#39ff14] border-[#39ff14] text-black'
          }`}
          title={isLocked ? 'Layout Locked - Click to Edit' : 'Layout Unlocked - Drag to Rearrange'}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </button>

        {!isLocked && (
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm bg-black/60 border border-orange-500/50 text-orange-400 hover:bg-orange-500/20 transition-all"
          >
            <RotateCcw size={14} />
            Reset
          </button>
        )}
      </div>

      {/* Editing Mode Banner */}
      {!isLocked && (
        <div className="bg-[#39ff14]/10 border border-[#39ff14]/30 rounded-lg px-4 py-2 mb-3 mx-4 text-center">
          <span className="text-[#39ff14] text-sm font-mono">
            ✏️ Layout Editing Mode — Drag panels by header, resize from edges
          </span>
        </div>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GRID LAYOUT - 24 Columns - Using DashboardWrapper (not WidthProvider) */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <DashboardWrapper
        layouts={layouts}
        onLayoutChange={handleLayoutChange}
        isDraggable={!isLocked}
        isResizable={!isLocked}
      >
        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 1: Token Image + Info (LEFT TOP) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="image-info">
          <DashboardPanel title="TOKEN" isEditing={!isLocked}>
            <TokenImageInfo tokenAddress={tokenAddress} />
          </DashboardPanel>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 2: Message Board (LEFT MIDDLE) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="message-board">
          <DashboardPanel title="MESSAGE BOARD" isEditing={!isLocked}>
            <MessageBoard tokenAddress={tokenAddress} />
          </DashboardPanel>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 3: Live Chat (LEFT BOTTOM) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="live-chat">
          <DashboardPanel title="LIVE CHAT" isEditing={!isLocked}>
            <LiveChat tokenAddress={tokenAddress} />
          </DashboardPanel>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 4: Price Chart (CENTER - HUGE) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="chart">
          <DashboardPanel title="CHART" isEditing={!isLocked}>
            <PriceChart tokenAddress={tokenAddress} />
          </DashboardPanel>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 5: Buys & Sells Table (CENTER BOTTOM) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="transactions">
          <DashboardPanel title="BUYS & SELLS" isEditing={!isLocked}>
            <BuySellsTable tokenAddress={tokenAddress} />
          </DashboardPanel>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 6: Swap Widget (RIGHT TOP) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="swap">
          <DashboardPanel title="SWAP" isEditing={!isLocked}>
            <SwapWidget
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
            />
          </DashboardPanel>
        </div>

        {/* ═══════════════════════════════════════════════════════════════════ */}
        {/* COMPONENT 7: Holders List (RIGHT BOTTOM) */}
        {/* ═══════════════════════════════════════════════════════════════════ */}
        <div key="holders">
          <DashboardPanel title="HOLDERS" isEditing={!isLocked}>
            <HoldersList
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
              totalSupply={totalSupply}
              creator={creator}
            />
          </DashboardPanel>
        </div>
      </DashboardWrapper>

      {/* ═══════════════════════════════════════════════════════════════════════ */}
      {/* GLOBAL STYLES FOR GRID */}
      {/* ═══════════════════════════════════════════════════════════════════════ */}
      <style jsx global>{`
        .react-grid-item.react-grid-placeholder {
          background: rgba(57, 255, 20, 0.15) !important;
          border: 2px dashed #39ff14 !important;
          border-radius: 8px;
        }
        .react-resizable-handle {
          background: transparent !important;
        }
        .react-resizable-handle::after {
          border-color: rgba(57, 255, 20, 0.5) !important;
        }
        .react-grid-item.resizing {
          z-index: 100;
          opacity: 0.9;
        }
        .react-grid-item.react-draggable-dragging {
          z-index: 100;
          box-shadow: 0 10px 40px rgba(57, 255, 20, 0.3);
        }
      `}</style>
    </div>
  );
}

export default TokenDashboard;
