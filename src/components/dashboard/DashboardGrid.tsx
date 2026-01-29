'use client';

import React, { Component, ReactNode } from 'react';
import { RefreshCw } from 'lucide-react';
import { ChartPanel } from './ChartPanel';
import { TradePanel } from './TradePanel';
import { TransactionFeed } from './TransactionFeed';
import { LiveChat } from './LiveChat';
import { MessageBoard } from './MessageBoard';
import { HoldersPanel } from './HoldersPanel';

interface DashboardGridProps {
  tokenAddress: `0x${string}`;
  tokenSymbol?: string;
  tokenName?: string;
  imageUri?: string;
  description?: string;
  currentPrice?: bigint;
  totalSupply?: bigint;
  creator?: `0x${string}`;
}

interface ErrorBoundaryProps {
  children: ReactNode;
  name: string;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

class PanelErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    console.error(`[${this.props.name}] Crash:`, error);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="h-full flex items-center justify-center bg-dark-secondary/50">
          <div className="text-center">
            <span className="text-2xl mb-2 block">⚠️</span>
            <p className="text-text-muted text-xs font-mono mb-2">{this.props.name} crashed</p>
            <button
              onClick={() => this.setState({ hasError: false })}
              className="flex items-center gap-1 mx-auto px-2 py-1 text-xs bg-fud-green/20 text-fud-green rounded hover:bg-fud-green/30"
            >
              <RefreshCw size={10} />
              Retry
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

/*
  FROM USER'S DRAWING:
  ┌─────────┬─────────────────────────────────────┬─────────┐
  │  LIVE   │                                     │  TOKEN  │
  │  CHAT   │                                     │  INFO   │
  │         │                                     ├─────────┤
  ├─────────┤            CHART                    │  SWAP   │
  │  LIVE   │           (HUGE)                    │         │
  │ MESSAGE │                                     ├─────────┤
  │  BOARD  ├─────────────────────────────────────┤ HOLDERS │
  │         │         BUYS & SELLS                │         │
  └─────────┴─────────────────────────────────────┴─────────┘
*/

export function DashboardGrid({
  tokenAddress,
  tokenSymbol,
  tokenName,
  imageUri,
  description,
  currentPrice,
  totalSupply,
  creator,
}: DashboardGridProps) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '200px 1fr 220px',
        gridTemplateRows: '160px 1fr 180px',
        gap: '8px',
        height: 'calc(100vh - 380px)',
        minHeight: '600px',
      }}
    >
      {/* LIVE CHAT - Left column, top */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-green/20 overflow-hidden flex flex-col"
        style={{ gridColumn: '1', gridRow: '1' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-green border-b border-fud-green/10 bg-dark-secondary/50">
          LIVE CHAT
        </div>
        <div className="flex-1 overflow-hidden">
          <PanelErrorBoundary name="Chat">
            <LiveChat tokenAddress={tokenAddress} />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* MESSAGE BOARD - Left column, middle and bottom */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-purple/20 overflow-hidden flex flex-col"
        style={{ gridColumn: '1', gridRow: '2 / 4' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-purple border-b border-fud-purple/10 bg-dark-secondary/50">
          MESSAGE BOARD
        </div>
        <div className="flex-1 overflow-hidden">
          <PanelErrorBoundary name="Board">
            <MessageBoard tokenAddress={tokenAddress} />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* CHART - Center column, spans top 2 rows (HUGE) */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-green/20 overflow-hidden flex flex-col"
        style={{ gridColumn: '2', gridRow: '1 / 3' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-green border-b border-fud-green/10 bg-dark-secondary/50">
          CHART
        </div>
        <div className="flex-1 overflow-hidden">
          <PanelErrorBoundary name="Chart">
            <ChartPanel tokenAddress={tokenAddress} />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* BUYS & SELLS - Center column, bottom row */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-green/20 overflow-hidden flex flex-col"
        style={{ gridColumn: '2', gridRow: '3' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-green border-b border-fud-green/10 bg-dark-secondary/50">
          BUYS & SELLS
        </div>
        <div className="flex-1 overflow-hidden">
          <PanelErrorBoundary name="Transactions">
            <TransactionFeed tokenAddress={tokenAddress} />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* TOKEN INFO - Right column, top */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-green/30 overflow-hidden flex flex-col"
        style={{ gridColumn: '3', gridRow: '1' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-green border-b border-fud-green/10 bg-dark-secondary/50">
          TOKEN
        </div>
        <div className="flex-1 overflow-hidden p-2">
          <PanelErrorBoundary name="Info">
            <div className="h-full flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-lg border border-fud-green/30 overflow-hidden bg-dark-secondary mb-2 flex-shrink-0">
                {imageUri ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={imageUri} alt={tokenName || 'Token'} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-2xl">🪙</div>
                )}
              </div>
              <h3 className="font-display text-xs text-center mb-1">
                {tokenName && tokenName.includes('.') ? (
                  <>
                    <span className="text-fud-green">{tokenName.split('.')[0]}</span>
                    <span className="text-white">.{tokenName.split('.').slice(1).join('.')}</span>
                  </>
                ) : (
                  <span className="text-fud-green">{tokenName || 'Token'}</span>
                )}
              </h3>
              <p className="text-[10px] font-mono text-text-muted">${tokenSymbol}</p>
            </div>
          </PanelErrorBoundary>
        </div>
      </div>

      {/* SWAP - Right column, middle */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-green/20 overflow-hidden flex flex-col"
        style={{ gridColumn: '3', gridRow: '2' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-green border-b border-fud-green/10 bg-dark-secondary/50">
          SWAP
        </div>
        <div className="flex-1 overflow-hidden">
          <PanelErrorBoundary name="Swap">
            <TradePanel tokenAddress={tokenAddress} tokenSymbol={tokenSymbol} />
          </PanelErrorBoundary>
        </div>
      </div>

      {/* HOLDERS - Right column, bottom */}
      <div
        className="bg-dark-primary rounded-lg border border-fud-green/20 overflow-hidden flex flex-col"
        style={{ gridColumn: '3', gridRow: '3' }}
      >
        <div className="h-7 flex items-center justify-center text-[10px] font-mono text-fud-green border-b border-fud-green/10 bg-dark-secondary/50">
          HOLDERS
        </div>
        <div className="flex-1 overflow-hidden">
          <PanelErrorBoundary name="Holders">
            <HoldersPanel tokenAddress={tokenAddress} tokenSymbol={tokenSymbol} totalSupply={totalSupply} creator={creator} />
          </PanelErrorBoundary>
        </div>
      </div>
    </div>
  );
}
