'use client';

// Re-export HoldersPanel as HoldersList for spec compliance
// The underlying HoldersPanel already has all required features:
// - Top holders list with percentages
// - Address formatting with explorer links
// - Block-by-block refresh via useBlockRefresh

export { HoldersPanel as HoldersList } from './HoldersPanel';
