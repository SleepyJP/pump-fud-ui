'use client';

import React, { useState } from 'react';
import { ExternalLink, RefreshCw, Maximize2, Minimize2 } from 'lucide-react';
import { type Address } from 'viem';

// ═══════════════════════════════════════════════════════════════════════════
// THE DIGITAL FORGE - DEX Screener Chart Embed
// Embeds DEX Screener chart for graduated tokens on PulseChain
// ═══════════════════════════════════════════════════════════════════════════

interface DexScreenerChartProps {
  tokenAddress: Address;
  pairAddress?: Address;
  graduated: boolean;
  className?: string;
}

// PulseChain chainId for DEX Screener
const PULSECHAIN_CHAIN_ID = 'pulsechain';

export function DexScreenerChart({
  tokenAddress,
  pairAddress,
  graduated,
  className = '',
}: DexScreenerChartProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [hasError, setHasError] = useState(false);

  // DEX Screener embed URL
  // For graduated tokens, use the pair address if available, otherwise token address
  const chartAddress = pairAddress || tokenAddress;
  const embedUrl = `https://dexscreener.com/${PULSECHAIN_CHAIN_ID}/${chartAddress}?embed=1&theme=dark&trades=0&info=0`;

  // Direct link to DEX Screener page
  const dexScreenerUrl = `https://dexscreener.com/${PULSECHAIN_CHAIN_ID}/${chartAddress}`;

  // Handle iframe load
  const handleLoad = () => {
    setIsLoading(false);
    setHasError(false);
  };

  // Handle iframe error
  const handleError = () => {
    setIsLoading(false);
    setHasError(true);
  };

  if (!graduated) {
    return (
      <div className={`flex items-center justify-center bg-gray-900/50 border border-gray-800 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">📊</span>
          </div>
          <h3 className="font-mono text-sm text-orange-400 mb-1">DEX Chart Coming Soon</h3>
          <p className="text-xs text-gray-500">
            Chart will be available after token graduates to DEX
          </p>
        </div>
      </div>
    );
  }

  if (hasError) {
    return (
      <div className={`flex items-center justify-center bg-gray-900/50 border border-gray-800 rounded-lg p-8 ${className}`}>
        <div className="text-center">
          <div className="w-12 h-12 rounded-full bg-red-500/20 flex items-center justify-center mx-auto mb-3">
            <span className="text-2xl">⚠️</span>
          </div>
          <h3 className="font-mono text-sm text-red-400 mb-1">Chart Unavailable</h3>
          <p className="text-xs text-gray-500 mb-3">
            Unable to load DEX Screener chart
          </p>
          <a
            href={dexScreenerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#d6ffe0]/20 text-[#d6ffe0] text-xs font-mono rounded hover:bg-[#d6ffe0]/30"
          >
            Open on DEX Screener
            <ExternalLink size={12} />
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${isFullscreen ? 'fixed inset-0 z-50 bg-black' : className}`}>
      {/* Header Bar */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-3 py-2 bg-gradient-to-b from-black/80 to-transparent">
        <div className="flex items-center gap-2">
          <span className="text-[10px] text-gray-400 font-mono">DEXSCREENER</span>
        </div>
        <div className="flex items-center gap-2">
          <a
            href={dexScreenerUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-gray-400 hover:text-[#d6ffe0] transition-colors"
            title="Open on DEX Screener"
          >
            <ExternalLink size={14} />
          </a>
          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 text-gray-400 hover:text-[#d6ffe0] transition-colors"
            title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
          >
            {isFullscreen ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
          </button>
        </div>
      </div>

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="flex flex-col items-center gap-3">
            <RefreshCw size={24} className="text-[#d6ffe0] animate-spin" />
            <span className="text-xs text-gray-400 font-mono">Loading chart...</span>
          </div>
        </div>
      )}

      {/* Chart Iframe */}
      <iframe
        src={embedUrl}
        title="DEX Screener Chart"
        className="w-full h-full border-0"
        style={{ minHeight: isFullscreen ? '100vh' : '400px' }}
        onLoad={handleLoad}
        onError={handleError}
        allow="clipboard-write"
        sandbox="allow-scripts allow-same-origin allow-popups"
      />

      {/* Fullscreen Close Button */}
      {isFullscreen && (
        <button
          onClick={() => setIsFullscreen(false)}
          className="fixed top-4 right-4 z-50 p-3 bg-black/80 rounded-full text-white hover:bg-black transition-colors"
        >
          <Minimize2 size={20} />
        </button>
      )}
    </div>
  );
}

export default DexScreenerChart;
