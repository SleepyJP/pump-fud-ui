'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { Layout } from 'react-grid-layout';
import { Lock, Unlock, RotateCcw } from 'lucide-react';

import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

import { DashboardWrapper } from './DashboardWrapper';
import { DashboardPanel } from './DashboardPanel';

import { TokenImageInfo } from './TokenImageInfo';
import { MessageBoard } from './MessageBoard';
import { LiveChat } from './LiveChat';
import { PriceChart } from './PriceChart';
import { BuySellsTable } from './BuySellsTable';
import { TokenInfoCard } from './TokenInfoCard';
import { SwapWidget } from './SwapWidget';
import { HoldersList } from './HoldersList';

const DEFAULT_LAYOUT: Layout[] = [
  { i: 'image-info', x: 0, y: 0, w: 5, h: 8, minW: 4, minH: 6, maxW: 8, maxH: 12 },
  { i: 'message-board', x: 0, y: 8, w: 5, h: 10, minW: 4, minH: 6, maxW: 8, maxH: 16 },
  { i: 'live-chat', x: 0, y: 18, w: 5, h: 10, minW: 4, minH: 6, maxW: 8, maxH: 14 },
  { i: 'chart', x: 5, y: 0, w: 14, h: 18, minW: 10, minH: 12, maxW: 18, maxH: 24 },
  { i: 'transactions', x: 5, y: 18, w: 14, h: 10, minW: 8, minH: 6, maxW: 18, maxH: 14 },
  { i: 'token-info', x: 19, y: 0, w: 5, h: 8, minW: 4, minH: 6, maxW: 8, maxH: 12 },
  { i: 'swap', x: 19, y: 8, w: 5, h: 10, minW: 4, minH: 8, maxW: 8, maxH: 14 },
  { i: 'holders', x: 19, y: 18, w: 5, h: 10, minW: 4, minH: 6, maxW: 8, maxH: 14 },
];

const STORAGE_KEY_PREFIX = 'pump-fud-dashboard-layout-';

interface TokenDashboardProps {
  address: string;
  tokenAddress?: `0x${string}`;
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
  address,
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
  const addr = (tokenAddress || address) as `0x${string}`;
  const [isLocked, setIsLocked] = useState(true);
  const [layouts, setLayouts] = useState<{ [key: string]: Layout[] }>({
    lg: DEFAULT_LAYOUT,
    md: DEFAULT_LAYOUT,
    sm: DEFAULT_LAYOUT,
    xs: DEFAULT_LAYOUT,
    xxs: DEFAULT_LAYOUT,
  });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const storageKey = `${STORAGE_KEY_PREFIX}${addr}`;
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length === 8) {
          setLayouts({ lg: parsed, md: parsed, sm: parsed, xs: parsed, xxs: parsed });
        } else if (typeof parsed === 'object' && parsed.lg) {
          setLayouts(parsed);
        }
      }
    } catch (e) {
      console.error('[TokenDashboard] Failed to load layout:', e);
    }
  }, [addr]);

  const handleLayoutChange = useCallback(
    (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => {
      setLayouts(allLayouts);
      if (!isLocked) {
        const storageKey = `${STORAGE_KEY_PREFIX}${addr}`;
        try {
          localStorage.setItem(storageKey, JSON.stringify(allLayouts));
        } catch (e) {
          console.error('[TokenDashboard] Failed to save layout:', e);
        }
      }
    },
    [addr, isLocked]
  );

  const handleReset = useCallback(() => {
    if (confirm('Reset layout to default?')) {
      const defaultLayouts = { lg: DEFAULT_LAYOUT, md: DEFAULT_LAYOUT, sm: DEFAULT_LAYOUT, xs: DEFAULT_LAYOUT, xxs: DEFAULT_LAYOUT };
      setLayouts(defaultLayouts);
      localStorage.removeItem(`${STORAGE_KEY_PREFIX}${addr}`);
    }
  }, [addr]);

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
      <div className="flex items-center justify-end gap-2 mb-3 px-4">
        <button
          onClick={() => setIsLocked(!isLocked)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm font-bold transition-all border ${
            isLocked
              ? 'bg-black/60 border-gray-700 text-gray-400 hover:border-[#39ff14]/50 hover:text-[#39ff14]'
              : 'bg-[#39ff14] border-[#39ff14] text-black'
          }`}
        >
          {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
          {isLocked ? 'LOCKED' : 'UNLOCKED'}
        </button>
        {!isLocked && (
          <button onClick={handleReset} className="flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm bg-black/60 border border-orange-500/50 text-orange-400 hover:bg-orange-500/20 transition-all">
            <RotateCcw size={14} /> Reset
          </button>
        )}
      </div>

      {!isLocked && (
        <div className="bg-[#39ff14]/10 border border-[#39ff14]/30 rounded-lg px-4 py-2 mb-3 mx-4 text-center">
          <span className="text-[#39ff14] text-sm font-mono">✏️ Layout Editing Mode — Drag panels by header, resize from edges</span>
        </div>
      )}

      <DashboardWrapper layouts={layouts} onLayoutChange={handleLayoutChange} isDraggable={!isLocked} isResizable={!isLocked}>
        <div key="image-info">
          <DashboardPanel title="TOKEN" isEditing={!isLocked}>
            <TokenImageInfo tokenAddress={addr} name={tokenName} symbol={tokenSymbol} image={imageUri} description={description} creator={creator} socials={socials} />
          </DashboardPanel>
        </div>
        <div key="message-board">
          <DashboardPanel title="MESSAGE BOARD" isEditing={!isLocked}>
            <MessageBoard tokenAddress={addr} />
          </DashboardPanel>
        </div>
        <div key="live-chat">
          <DashboardPanel title="LIVE CHAT" isEditing={!isLocked}>
            <LiveChat tokenAddress={addr} />
          </DashboardPanel>
        </div>
        <div key="chart">
          <DashboardPanel title="CHART" isEditing={!isLocked}>
            <PriceChart tokenAddress={addr} />
          </DashboardPanel>
        </div>
        <div key="transactions">
          <DashboardPanel title="BUYS & SELLS" isEditing={!isLocked}>
            <BuySellsTable tokenAddress={addr} />
          </DashboardPanel>
        </div>
        <div key="token-info">
          <DashboardPanel title="INFO" isEditing={!isLocked}>
            <TokenInfoCard tokenAddress={addr} currentPrice={currentPrice} totalSupply={totalSupply} plsReserve={plsReserve} graduated={graduated} />
          </DashboardPanel>
        </div>
        <div key="swap">
          <DashboardPanel title="SWAP" isEditing={!isLocked}>
            <SwapWidget tokenAddress={addr} tokenSymbol={tokenSymbol} currentPrice={currentPrice} />
          </DashboardPanel>
        </div>
        <div key="holders">
          <DashboardPanel title="HOLDERS" isEditing={!isLocked}>
            <HoldersList tokenAddress={addr} tokenSymbol={tokenSymbol} totalSupply={totalSupply} creator={creator} />
          </DashboardPanel>
        </div>
      </DashboardWrapper>

      <style jsx global>{`
        .react-grid-item.react-grid-placeholder { background: rgba(57, 255, 20, 0.15) !important; border: 2px dashed #39ff14 !important; border-radius: 8px; }
        .react-resizable-handle { background: transparent !important; }
        .react-resizable-handle::after { border-color: rgba(57, 255, 20, 0.5) !important; }
        .react-grid-item.resizing { z-index: 100; opacity: 0.9; }
        .react-grid-item.react-draggable-dragging { z-index: 100; box-shadow: 0 10px 40px rgba(57, 255, 20, 0.3); }
      `}</style>
    </div>
  );
}

export default TokenDashboard;
