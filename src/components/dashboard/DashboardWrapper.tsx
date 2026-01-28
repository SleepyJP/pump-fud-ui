'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Responsive, Layout } from 'react-grid-layout';
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';

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

  useEffect(() => {
    setMounted(true);
    if (!containerRef.current) return;

    const measure = () => {
      if (containerRef.current) {
        const w = containerRef.current.offsetWidth;
        if (w > 0) setWidth(w);
      }
    };

    measure();

    const observer = new ResizeObserver(() => measure());
    observer.observe(containerRef.current);

    return () => observer.disconnect();
  }, []);

  if (!mounted || width === 0) {
    return (
      <div ref={containerRef} className="w-full min-h-[600px]">
        <div className="flex items-center justify-center h-64">
          <div className="flex flex-col items-center gap-4">
            <div className="w-8 h-8 border-2 border-[#39ff14] border-t-transparent rounded-full animate-spin" />
            <span className="text-[#39ff14] animate-pulse font-mono text-sm">Initializing grid...</span>
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
