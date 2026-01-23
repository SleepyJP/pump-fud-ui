'use client';

import { ReactNode, useState } from 'react';
import { GripHorizontal, Palette } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { getSkinClasses, PANEL_SKINS, type PanelSkin, type PanelType } from '@/types';
import { useSiteSettings } from '@/stores/siteSettingsStore';
import clsx from 'clsx';

interface PanelWrapperProps {
  children: ReactNode;
  panelId: PanelType;
  skin: PanelSkin;
  isLocked: boolean;
}

export function PanelWrapper({ children, panelId, skin, isLocked }: PanelWrapperProps) {
  const [showSkinPicker, setShowSkinPicker] = useState(false);
  const { setPanelSkin } = useDashboardStore();
  const { panelBackgrounds } = useSiteSettings();

  const customBg = panelBackgrounds[panelId];
  const skinClasses = getSkinClasses(skin);

  return (
    <div
      className={clsx(
        'h-full w-full rounded-xl border overflow-hidden relative transition-all duration-300',
        skinClasses,
        !isLocked && 'ring-2 ring-fud-green/30 ring-offset-2 ring-offset-dark-primary'
      )}
      style={
        customBg
          ? {
              backgroundImage: `url(${customBg})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }
          : undefined
      }
    >
      {/* Drag Handle - only visible when unlocked */}
      {!isLocked && (
        <div className="panel-drag-handle absolute top-0 left-0 right-0 h-8 bg-gradient-to-b from-black/50 to-transparent cursor-move z-10 flex items-center justify-center gap-2">
          <GripHorizontal size={16} className="text-fud-green" />
          <span className="text-xs font-mono text-fud-green uppercase">{panelId}</span>

          {/* Skin picker toggle */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSkinPicker(!showSkinPicker);
            }}
            className="ml-auto mr-2 p-1 rounded hover:bg-fud-green/20 transition-colors"
          >
            <Palette size={14} className="text-fud-green" />
          </button>
        </div>
      )}

      {/* Skin Picker Dropdown */}
      {!isLocked && showSkinPicker && (
        <div className="absolute top-10 right-2 z-50 p-2 bg-dark-primary border border-fud-green/30 rounded-lg shadow-xl min-w-[160px]">
          <div className="text-xs font-mono text-text-muted mb-2 px-1">Panel Skin</div>
          <div className="space-y-1">
            {PANEL_SKINS.map((s) => (
              <button
                key={s.id}
                onClick={() => {
                  setPanelSkin(panelId, s.id);
                  setShowSkinPicker(false);
                }}
                className={clsx(
                  'w-full px-2 py-1.5 text-left text-xs font-mono rounded transition-all',
                  skin === s.id
                    ? 'bg-fud-green/20 text-fud-green'
                    : 'text-text-secondary hover:bg-dark-secondary hover:text-text-primary'
                )}
              >
                <span className={clsx('inline-block w-3 h-3 rounded mr-2 border', s.preview)} />
                {s.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Resize indicators when unlocked */}
      {!isLocked && (
        <>
          <div className="absolute bottom-0 right-0 w-4 h-4 cursor-se-resize">
            <svg className="w-full h-full text-fud-green/50" viewBox="0 0 16 16">
              <path d="M14 14L2 14L14 2Z" fill="currentColor" />
            </svg>
          </div>
        </>
      )}

      {/* Panel Content */}
      <div className={clsx('h-full w-full', !isLocked && 'pt-8')}>
        {children}
      </div>
    </div>
  );
}
