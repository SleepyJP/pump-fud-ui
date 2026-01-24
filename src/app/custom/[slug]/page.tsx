'use client';

import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Lock, ArrowLeft, Settings } from 'lucide-react';
import { useAccount } from 'wagmi';
import { useCustomPages } from '@/stores/customPagesStore';
import { isAdminWallet } from '@/stores/siteSettingsStore';
import { ChartPanel } from '@/components/dashboard/ChartPanel';
import { TradePanel } from '@/components/dashboard/TradePanel';
import { LiveChat } from '@/components/dashboard/LiveChat';
import { MessageBoard } from '@/components/dashboard/MessageBoard';
import { HoldersPanel } from '@/components/dashboard/HoldersPanel';
import { InfoPanel } from '@/components/dashboard/InfoPanel';
import { PanelWrapper } from '@/components/dashboard/PanelWrapper';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import type { PanelType } from '@/types';

const ReactGridLayout = require('react-grid-layout');
import 'react-grid-layout/css/styles.css';

const { WidthProvider, default: GridLayout } = ReactGridLayout;
const ResponsiveGridLayout = WidthProvider(GridLayout);

const ROW_HEIGHT = 60;
const COLS = 12;
const MARGIN: [number, number] = [12, 12];

export default function CustomPageView() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const slug = params.slug as string;

  const { address, isConnected } = useAccount();
  const isAdmin = isAdminWallet(address);

  const { customPages, getPageBySlug, updatePage } = useCustomPages();
  const [mounted, setMounted] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const tokenAddress = searchParams.get('token') as `0x${string}` | null;

  useEffect(() => {
    setMounted(true);
  }, []);

  const page = useMemo(() => getPageBySlug(slug), [slug, customPages, getPageBySlug]);

  const handleLayoutChange = useCallback(
    (newLayout: { i: string; x: number; y: number; w: number; h: number }[]) => {
      if (!page || !isEditMode) return;

      const updatedPanels = page.panels.map((panel) => {
        const layoutItem = newLayout.find((l) => l.i === panel.id);
        if (layoutItem) {
          return {
            ...panel,
            x: layoutItem.x,
            y: layoutItem.y,
            w: layoutItem.w,
            h: layoutItem.h,
          };
        }
        return panel;
      });

      updatePage(page.id, { panels: updatedPanels });
    },
    [page, isEditMode, updatePage]
  );

  const renderPanel = (panelType: PanelType) => {
    switch (panelType) {
      case 'chart':
        return <ChartPanel tokenAddress={tokenAddress || undefined} />;
      case 'trade':
        return <TradePanel tokenAddress={tokenAddress || undefined} />;
      case 'chat':
        return <LiveChat tokenAddress={tokenAddress || undefined} />;
      case 'board':
        return <MessageBoard tokenAddress={tokenAddress || undefined} />;
      case 'holders':
        return <HoldersPanel tokenAddress={tokenAddress || undefined} />;
      case 'info':
        return <InfoPanel tokenAddress={tokenAddress || undefined} />;
      default:
        return null;
    }
  };

  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-fud-green font-mono animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!page) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <h1 className="font-display text-2xl text-fud-red mb-2">Page Not Found</h1>
          <p className="text-text-muted font-mono text-sm mb-4">
            The custom page "{slug}" does not exist.
          </p>
          <Button onClick={() => router.push('/')} variant="secondary">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  if (!page.isPublic && !isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="max-w-md w-full p-8 text-center">
          <Lock className="w-16 h-16 mx-auto mb-4 text-fud-red" />
          <h1 className="font-display text-2xl text-fud-red mb-2">Private Page</h1>
          <p className="text-text-muted font-mono text-sm mb-4">
            This page is private and only accessible to admins.
          </p>
          <Button onClick={() => router.push('/')} variant="secondary">
            Go Home
          </Button>
        </Card>
      </div>
    );
  }

  const gridLayout = page.panels
    .filter((p) => p.visible)
    .map((panel) => ({
      i: panel.id,
      x: panel.x,
      y: panel.y,
      w: panel.w,
      h: panel.h,
      minW: 3,
      minH: 3,
      static: !isEditMode,
      isDraggable: isEditMode,
      isResizable: isEditMode,
    }));

  return (
    <div
      className="min-h-screen"
      style={
        page.background
          ? {
              backgroundImage: `url(${page.background})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              backgroundAttachment: 'fixed',
            }
          : undefined
      }
    >
      <div className="max-w-[1600px] mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-lg bg-dark-secondary border border-border-primary text-text-muted hover:text-fud-green hover:border-fud-green/50 transition-colors"
            >
              <ArrowLeft size={20} />
            </button>
            <div>
              <h1 className="font-display text-2xl text-fud-green">{page.name}</h1>
              {page.description && (
                <p className="text-text-muted font-mono text-sm">{page.description}</p>
              )}
            </div>
          </div>

          {isAdmin && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditMode(!isEditMode)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-sm transition-all ${
                  isEditMode
                    ? 'bg-fud-green/20 border border-fud-green text-fud-green animate-pulse'
                    : 'bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-green/50 hover:text-fud-green'
                }`}
              >
                <Settings size={16} />
                {isEditMode ? 'EDITING - DRAG PANELS' : 'Edit Layout'}
              </button>
            </div>
          )}
        </div>

        {!tokenAddress && (
          <Card className="p-4 mb-6 border-fud-orange/30">
            <p className="text-fud-orange font-mono text-sm text-center">
              No token selected. Add ?token=0x... to the URL to load token data.
            </p>
          </Card>
        )}

        {page.panels.length === 0 ? (
          <Card className="p-12 text-center">
            <p className="text-text-muted font-mono">
              No panels configured for this page.
              {isAdmin && ' Go to Settings → Custom Pages to add panels.'}
            </p>
          </Card>
        ) : (
          <div ref={containerRef}>
            <ResponsiveGridLayout
              className="layout"
              layout={gridLayout}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              margin={MARGIN}
              containerPadding={[0, 0]}
              isDraggable={isEditMode}
              isResizable={isEditMode}
              onLayoutChange={handleLayoutChange}
              draggableHandle=".panel-drag-handle"
              resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
              useCSSTransforms={true}
              compactType="vertical"
              preventCollision={false}
              isBounded={false}
            >
              {page.panels
                .filter((p) => p.visible)
                .map((panel) => (
                  <div key={panel.id} className="overflow-hidden">
                    <PanelWrapper panelId={panel.type} skin="default" isLocked={!isEditMode}>
                      {renderPanel(panel.type)}
                    </PanelWrapper>
                  </div>
                ))}
            </ResponsiveGridLayout>
          </div>
        )}
      </div>
    </div>
  );
}
