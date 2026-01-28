'use client';

import React from 'react';
import { GripVertical } from 'lucide-react';

interface DashboardPanelProps {
  title: string;
  isEditing: boolean;
  children: React.ReactNode;
}

export function DashboardPanel({ title, isEditing, children }: DashboardPanelProps) {
  return (
    <div className={`h-full flex flex-col bg-black/60 border rounded-lg overflow-hidden ${isEditing ? 'border-dashed border-[#39ff14]/50' : 'border-[#39ff14]/30'}`}>
      <div className={`drag-handle h-8 flex items-center justify-center gap-2 text-xs font-mono border-b ${isEditing ? 'cursor-move bg-[#39ff14]/10 text-[#39ff14] border-[#39ff14]/30' : 'bg-black/40 text-gray-500 border-gray-800'}`}>
        {isEditing && <GripVertical className="w-3 h-3 text-[#39ff14]/70" />}
        <span>{title}</span>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  );
}

export default DashboardPanel;
