'use client';

import { useState } from 'react';
import { Palette, ChevronDown } from 'lucide-react';
import { useDashboardStore } from '@/stores/dashboardStore';
import { PANEL_SKINS, type PanelSkin, type PanelType } from '@/types';
import clsx from 'clsx';

const PANEL_LABELS: Record<PanelType, string> = {
  chart: 'Chart',
  trade: 'Trade',
  chat: 'Live Chat',
  board: 'Message Board',
  holders: 'Holders',
  info: 'Info',
};

export function SkinSelector() {
  const [isOpen, setIsOpen] = useState(false);
  const { panelSkins, setPanelSkin, activePanels } = useDashboardStore();

  const applyToAll = (skin: PanelSkin) => {
    activePanels.forEach((panel) => {
      setPanelSkin(panel, skin);
    });
  };

  return (
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg font-mono text-sm bg-dark-secondary border border-border-primary text-text-muted hover:border-fud-green/50 hover:text-fud-green transition-all"
      >
        <Palette size={16} />
        <span>Skins</span>
        <ChevronDown size={14} className={clsx('transition-transform', isOpen && 'rotate-180')} />
      </button>

      {isOpen && (
        <div className="absolute top-full right-0 mt-2 z-50 p-3 bg-dark-primary border border-fud-green/30 rounded-xl shadow-2xl min-w-[280px]">
          <div className="text-xs font-mono text-fud-green mb-3 pb-2 border-b border-border-primary">
            PANEL SKINS
          </div>

          {/* Apply to All */}
          <div className="mb-4">
            <div className="text-xs font-mono text-text-muted mb-2">Apply to All Panels</div>
            <div className="grid grid-cols-4 gap-1">
              {PANEL_SKINS.map((skin) => (
                <button
                  key={skin.id}
                  onClick={() => applyToAll(skin.id)}
                  className={clsx(
                    'p-2 rounded border transition-all text-xs',
                    skin.preview,
                    'hover:scale-105'
                  )}
                  title={skin.name}
                >
                  {skin.name.charAt(0)}
                </button>
              ))}
            </div>
          </div>

          {/* Per-Panel Selection */}
          <div className="space-y-3">
            {activePanels.map((panel) => (
              <div key={panel}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-mono text-text-secondary">
                    {PANEL_LABELS[panel]}
                  </span>
                  <span className="text-xs font-mono text-fud-green">
                    {PANEL_SKINS.find((s) => s.id === panelSkins[panel])?.name}
                  </span>
                </div>
                <div className="grid grid-cols-8 gap-1">
                  {PANEL_SKINS.map((skin) => (
                    <button
                      key={skin.id}
                      onClick={() => setPanelSkin(panel, skin.id)}
                      className={clsx(
                        'w-6 h-6 rounded border transition-all',
                        skin.preview,
                        panelSkins[panel] === skin.id && 'ring-2 ring-fud-green ring-offset-1 ring-offset-dark-primary',
                        'hover:scale-110'
                      )}
                      title={skin.name}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full py-2 text-xs font-mono text-text-muted hover:text-fud-green border border-border-primary rounded-lg hover:border-fud-green/30 transition-all"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
