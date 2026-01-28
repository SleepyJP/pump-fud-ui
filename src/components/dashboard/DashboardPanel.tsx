'use client';
import React from 'react';
import { GripVertical } from 'lucide-react';
export function DashboardPanel({ title, isEditing, children }: { title: string; isEditing: boolean; children: React.ReactNode }) {
  return (<div className="h-full flex flex-col bg-gray-900/50 border border-gray-800 rounded-lg overflow-hidden"><div className={`drag-handle flex items-center gap-2 px-3 py-2 bg-gray-900 border-b border-gray-800 ${isEditing ? "cursor-move" : ""}`}>{isEditing && <GripVertical className="w-4 h-4 text-gray-500" />}<span className="text-sm font-medium text-gray-300">{title}</span></div><div className="flex-1 overflow-auto p-3">{children}</div></div>);
}
export default DashboardPanel;
