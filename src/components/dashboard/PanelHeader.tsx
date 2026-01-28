'use client';

import { GripHorizontal, Palette } from 'lucide-react';

interface PanelHeaderProps {
  title: string;
  icon?: string;
  showDrag?: boolean;
  showSkin?: boolean;
  onSkinClick?: () => void;
  children?: React.ReactNode;
}

export function PanelHeader({ title, icon, showDrag = true, showSkin = true, onSkinClick, children }: PanelHeaderProps) {
  return (
    <div className="flex items-center justify-between px-3 py-2 border-b border-fud-green/20 bg-dark-secondary/50">
      <div className="flex items-center gap-2">
        {showDrag && (
          <span className="text-text-muted text-xs flex items-center gap-1 cursor-move panel-drag-handle">
            <GripHorizontal size={12} />
            <span className="hidden sm:inline">DRAG</span>
          </span>
        )}
        <span className="text-fud-green font-mono text-sm font-semibold flex items-center gap-1">
          {icon && <span>{icon}</span>}
          {title}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {children}
        {showSkin && (
          <button
            onClick={onSkinClick}
            className="text-text-muted hover:text-fud-purple transition-colors"
            title="Change skin"
          >
            <Palette size={14} />
          </button>
        )}
      </div>
    </div>
  );
}
