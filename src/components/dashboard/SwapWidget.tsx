'use client';

// Re-export TradePanel as SwapWidget for spec compliance
// The underlying TradePanel already has all required features:
// - Buy/Sell toggle
// - Amount input with PLS balance display
// - Slippage settings
// - Transaction execution via wagmi

export { TradePanel as SwapWidget } from './TradePanel';
