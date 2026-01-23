'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { Lock, Unlock, RotateCcw, Settings } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ChartPanel } from './ChartPanel';
import { TradePanel } from './TradePanel';
import { LiveChat } from './LiveChat';
import { MessageBoard } from './MessageBoard';
import { PanelWrapper } from './PanelWrapper';
import { SkinSelector } from './SkinSelector';
import type { PanelType, PanelLayout } from '@/types';

// Dynamic require to avoid Turbopack ESM export issues with WidthProvider
// eslint-disable-next-line @typescript-eslint/no-require-imports
const ReactGridLayout = require('react-grid-layout');
import 'react-grid-layout/css/styles.css';

const { WidthProvider, default: GridLayout } = ReactGridLayout;
const ResponsiveGridLayout = WidthProvider(GridLayout);

interface DashboardGridProps {
  tokenAddress: `0x${string}`;
  tokenSymbol?: string;
  currentPrice?: bigint;
}

const ROW_HEIGHT = 60;
const COLS = 12;
const MARGIN: [number, number] = [12, 12];

export function DashboardGrid({ tokenAddress, tokenSymbol, currentPrice }: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);

  const {
    layouts,
    setLayouts,
    isLocked,
    toggleLock,
    resetLayout,
    activePanels,
    panelSkins,
  } = useDashboardStore();

  // Wait for client-side mount to avoid hydration issues
  useEffect(() => {
    setMounted(true);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback(
    (newLayout: any[]) => {
      if (!isLocked && Array.isArray(newLayout) && newLayout.length > 0) {
        const updatedLayouts: PanelLayout[] = newLayout.map((item: any) => ({
          i: item.i,
          x: item.x,
          y: item.y,
          w: item.w,
          h: item.h,
          minW: item.minW,
          minH: item.minH,
        }));
        setLayouts(updatedLayouts);
      }
    },
    [isLocked, setLayouts]
  );

  const gridLayout = useMemo(() => {
    return layouts
      .filter((l) => activePanels.includes(l.i as PanelType))
      .map((l) => ({
        ...l,
        static: isLocked,
        isDraggable: !isLocked,
        isResizable: !isLocked,
      }));
  }, [layouts, activePanels, isLocked]);

  const renderPanel = (panelId: PanelType) => {
    const skin = panelSkins[panelId];

    switch (panelId) {
      case 'chart':
        return (
          <PanelWrapper panelId={panelId} skin={skin} isLocked={isLocked}>
            <ChartPanel tokenAddress={tokenAddress} />
          </PanelWrapper>
        );
      case 'trade':
        return (
          <PanelWrapper panelId={panelId} skin={skin} isLocked={isLocked}>
            <TradePanel
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
              currentPrice={currentPrice}
            />
          </PanelWrapper>
        );
      case 'chat':
        return (
          <PanelWrapper panelId={panelId} skin={skin} isLocked={isLocked}>
            <LiveChat tokenAddress={tokenAddress} />
          </PanelWrapper>
        );
      case 'board':
        return (
          <PanelWrapper panelId={panelId} skin={skin} isLocked={isLocked}>
            <MessageBoard tokenAddress={tokenAddress} />
          </PanelWrapper>
        );
      default:
        return null;
    }
  };

  // Don't render grid until mounted (avoids hydration issues)
  if (!mounted) {
    return (
      <div ref={containerRef} className="relative min-h-[600px]">
        <div className="flex items-center justify-center h-full">
          <div className="text-fud-green font-mono animate-pulse">Loading Dashboard...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={containerRef}>
      {/* Dashboard Controls */}
      <div className="flex items-center justify-between mb-4 px-2">
        <div className="flex items-center gap-2">
          <button
            onClick={toggleLock}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
              isLocked
                ? 'bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-green/50 hover:text-fud-green'
                : 'bg-fud-green/20 border border-fud-green text-fud-green animate-pulse'
            }`}
          >
            {isLocked ? (
              <>
                <Lock size={16} />
                <span>LOCKED</span>
              </>
            ) : (
              <>
                <Unlock size={16} />
                <span>UNLOCKED - DRAG PANELS</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              resetLayout();
              // Also clear localStorage to fix stale layout data
              if (typeof window !== 'undefined') {
                localStorage.removeItem('pump-fud-dashboard');
              }
            }}
            title="Reset panels to default positions (fixes layout gaps)"
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-orange/50 hover:text-fud-orange transition-all"
          >
            <RotateCcw size={16} />
            <span>Reset</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          {!isLocked && <SkinSelector />}
          <a
            href="/settings"
            className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-purple/50 hover:text-fud-purple transition-all"
          >
            <Settings size={16} />
            <span>Settings</span>
          </a>
        </div>
      </div>

      {/* Unlock Indicator */}
      {!isLocked && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-fud-green/20 border border-fud-green rounded-lg font-mono text-sm text-fud-green animate-bounce">
          Drag panels to reposition • Drag edges to resize • Click LOCK when done
        </div>
      )}

      {/* Grid Layout */}
      <ResponsiveGridLayout
        className="layout"
        layout={gridLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        margin={MARGIN}
        containerPadding={[0, 0]}
        isDraggable={!isLocked}
        isResizable={!isLocked}
        onLayoutChange={handleLayoutChange}
        draggableHandle=".panel-drag-handle"
        resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
        isBounded={false}
      >
        {activePanels.map((panelId) => (
          <div key={panelId} className="overflow-hidden">
            {renderPanel(panelId)}
          </div>
        ))}
      </ResponsiveGridLayout>
    </div>
  );
}
