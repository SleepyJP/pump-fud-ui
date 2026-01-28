'use client';

// Re-export TransactionFeed as BuySellsTable for spec compliance
// The underlying TransactionFeed already has all required features:
// - Real-time transaction display
// - Buy/Sell indicators with color coding
// - Block-by-block refresh via useBlockRefresh

export { TransactionFeed as BuySellsTable } from './TransactionFeed';
