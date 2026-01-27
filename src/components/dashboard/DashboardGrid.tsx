'use client';

import { useMemo, useCallback, useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { Lock, Unlock, RotateCcw, Settings } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { ADMIN_WALLET } from '@/stores/siteSettingsStore';
import { ChartPanel } from './ChartPanel';
import { TradePanel } from './TradePanel';
import { LiveChat } from './LiveChat';
import { MessageBoard } from './MessageBoard';
import { HoldersPanel } from './HoldersPanel';
import { InfoPanel } from './InfoPanel';
import { PanelWrapper } from './PanelWrapper';
import { SkinSelector } from './SkinSelector';
import type { PanelType, PanelLayout } from '@/types';

// Import CSS for react-grid-layout
import 'react-grid-layout/css/styles.css';

interface DashboardGridProps {
  tokenAddress: `0x${string}`;
  tokenSymbol?: string;
  currentPrice?: bigint;
  totalSupply?: bigint;
  creator?: `0x${string}`;
}

const ROW_HEIGHT = 60;
const COLS = 12;
const MARGIN: [number, number] = [12, 12];

export function DashboardGrid({ tokenAddress, tokenSymbol, currentPrice, totalSupply, creator }: DashboardGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeObserverRef = useRef<ResizeObserver | null>(null);
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [GridComponent, setGridComponent] = useState<any>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [loadError, setLoadError] = useState<string | null>(null);
  const { address, isConnected } = useAccount();

  // Only admin wallet can unlock/modify the dashboard
  const isAdmin = isConnected && address?.toLowerCase() === ADMIN_WALLET.toLowerCase();

  const {
    layouts,
    setLayouts,
    isLocked,
    toggleLock,
    resetLayout,
    activePanels,
    panelSkins,
  } = useDashboardStore();

  // Callback ref pattern for reliable width measurement
  const measureRef = useCallback((node: HTMLDivElement | null) => {
    // Cleanup previous observer
    if (resizeObserverRef.current) {
      resizeObserverRef.current.disconnect();
      resizeObserverRef.current = null;
    }

    if (node) {
      containerRef.current = node;

      // Measure immediately
      const measureWidth = () => {
        const width = node.offsetWidth;
        if (width > 0) {
          setContainerWidth(width);
        } else if (typeof window !== 'undefined') {
          // Fallback to window width minus padding
          const fallbackWidth = window.innerWidth - 32;
          if (fallbackWidth > 0) {
            setContainerWidth(fallbackWidth);
          }
        }
      };

      // Try measuring immediately
      measureWidth();

      // Also try after a brief delay in case CSS hasn't loaded
      setTimeout(measureWidth, 100);
      setTimeout(measureWidth, 500);

      // Setup observer for future resizes
      resizeObserverRef.current = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const newWidth = entry.contentRect.width;
          if (newWidth > 0) {
            setContainerWidth(newWidth);
          }
        }
      });
      resizeObserverRef.current.observe(node);
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, []);

  // Load react-grid-layout v2 on client side only
  useEffect(() => {
    setMounted(true);

    // Dynamic import with error handling for v2 API
    const loadGridLayout = async () => {
      try {
        const mod = await import('react-grid-layout');
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const RGL = mod as any;

        // v2 API: Use GridLayout directly (no WidthProvider, we manage width ourselves)
        const GridLayout = RGL.GridLayout || RGL.ReactGridLayout || RGL.default;

        if (!GridLayout) {
          throw new Error('GridLayout component not found in react-grid-layout');
        }

        setGridComponent(() => GridLayout);
      } catch (err) {
        console.error('Failed to load react-grid-layout:', err);
        setLoadError(err instanceof Error ? err.message : 'Failed to load grid component');
      }
    };

    loadGridLayout();
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleLayoutChange = useCallback(
    (newLayout: any[]) => {
      if (!isLocked && Array.isArray(newLayout) && newLayout.length > 0) {
        const updatedLayouts: PanelLayout[] = newLayout.map((item) => ({
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
      case 'holders':
        return (
          <PanelWrapper panelId={panelId} skin={skin} isLocked={isLocked}>
            <HoldersPanel
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
              totalSupply={totalSupply}
              creator={creator}
            />
          </PanelWrapper>
        );
      case 'info':
        return (
          <PanelWrapper panelId={panelId} skin={skin} isLocked={isLocked}>
            <InfoPanel
              tokenAddress={tokenAddress}
              tokenSymbol={tokenSymbol}
              creator={creator}
            />
          </PanelWrapper>
        );
      default:
        return null;
    }
  };

  // Error state
  if (loadError) {
    return (
      <div ref={measureRef} className="relative min-h-[600px]">
        <div className="flex flex-col items-center justify-center h-full gap-4">
          <div className="text-4xl">⚠️</div>
          <div className="text-red-500 font-mono text-sm">Failed to load dashboard</div>
          <div className="text-text-muted font-mono text-xs">{loadError}</div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-fud-green/20 border border-fud-green text-fud-green rounded-lg font-mono text-sm"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  // Loading state - wait for mount, GridComponent, AND container width
  if (!mounted || !GridComponent || containerWidth === 0) {
    return (
      <div ref={measureRef} className="relative min-h-[600px]">
        <div className="flex items-center justify-center h-full">
          <div className="flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-fud-green/20 border-t-fud-green rounded-full animate-spin" />
            <div className="text-fud-green font-mono animate-pulse">Loading Dashboard...</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative" ref={measureRef}>
      {/* Dashboard Controls - ADMIN ONLY */}
      {isAdmin && (
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
                  <span>Unlock UI</span>
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
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('pump-fud-dashboard');
                }
              }}
              title="Reset panels to default positions"
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
      )}

      {/* Unlock Indicator - ADMIN ONLY */}
      {isAdmin && !isLocked && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-50 px-4 py-2 bg-fud-green/20 border border-fud-green rounded-lg font-mono text-sm text-fud-green animate-bounce">
          Drag panels to reposition • Drag edges to resize • Click LOCK when done
        </div>
      )}

      {/* Grid Layout - v2 API requires explicit width */}
      <GridComponent
        className="layout"
        layout={gridLayout}
        cols={COLS}
        rowHeight={ROW_HEIGHT}
        width={containerWidth}
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
      </GridComponent>
    </div>
  );
}
