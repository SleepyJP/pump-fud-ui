'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Responsive, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

// DO NOT use WidthProvider - it's broken in v2
// We measure width manually with ResizeObserver

interface DashboardWrapperProps {
  children: React.ReactNode;
  layouts: { [key: string]: Layout[] };
  onLayoutChange: (currentLayout: Layout[], allLayouts: { [key: string]: Layout[] }) => void;
  isDraggable: boolean;
  isResizable: boolean;
  rowHeight?: number;
  cols?: { [key: string]: number };
  breakpoints?: { [key: string]: number };
}

export function DashboardWrapper({
  children,
  layouts,
  onLayoutChange,
  isDraggable,
  isResizable,
  rowHeight = 30,
  cols = { lg: 24, md: 20, sm: 12, xs: 8, xxs: 4 },
  breakpoints = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 },
}: DashboardWrapperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number>(0);
  const [mounted, setMounted] = useState(false);

  // Measure container width
  useEffect(() => {
    setMounted(true);

    if (!containerRef.current) return;

    // Initial measurement
    const initialWidth = containerRef.current.offsetWidth;
    if (initialWidth > 0) {
      setWidth(initialWidth);
    }

    // ResizeObserver for responsive updates
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newWidth = entry.contentRect.width;
        if (newWidth > 0) {
          setWidth(newWidth);
        }
      }
    });

    observer.observe(containerRef.current);

    return () => {
      observer.disconnect();
    };
  }, []);

  // Don't render grid until:
  // 1. Component is mounted (client-side)
  // 2. We have a valid width measurement
  if (!mounted || width === 0) {
    return (
      <div ref={containerRef} className="w-full min-h-[600px] bg-black">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#39ff14] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#39ff14] animate-pulse font-mono text-sm">Initializing dashboard...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="w-full">
      <Responsive
        className="layout"
        layouts={layouts}
        breakpoints={breakpoints}
        cols={cols}
        rowHeight={rowHeight}
        width={width}
        margin={[12, 12]}
        containerPadding={[12, 12]}
        isDraggable={isDraggable}
        isResizable={isResizable}
        onLayoutChange={onLayoutChange}
        resizeHandles={['se', 'sw', 'ne', 'nw', 'e', 'w', 'n', 's']}
        draggableHandle=".drag-handle"
        useCSSTransforms={true}
        compactType="vertical"
        preventCollision={false}
      >
        {children}
      </Responsive>
    </div>
  );
}

export default DashboardWrapper;
