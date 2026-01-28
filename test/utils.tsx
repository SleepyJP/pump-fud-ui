import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// TEST UTILITIES FOR PUMP.FUD DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════════

// Mock providers wrapper
function AllTheProviders({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}

// Custom render function with providers
const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

// Re-export everything
export * from '@testing-library/react';
export { customRender as render };

// Format address utility (matches src/lib/utils.ts)
export const formatAddress = (address: string): string => {
  if (!address) return '';
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};

// Format PLS utility
export const formatPLS = (value: bigint | number): string => {
  const num = typeof value === 'bigint' ? Number(value) / 1e18 : value;
  if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(2)}M`;
  if (num >= 1_000) return `${(num / 1_000).toFixed(2)}K`;
  return num.toFixed(2);
};

// Wait for async state updates
export const waitForStateUpdate = () => new Promise((resolve) => setTimeout(resolve, 0));

// Wait for animations to complete
export const waitForAnimation = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

// Create a mock event
export const createMockEvent = (overrides = {}) => ({
  preventDefault: vi.fn(),
  stopPropagation: vi.fn(),
  target: { value: '' },
  ...overrides,
});

// Mock element dimensions
export const mockElementDimensions = (element: HTMLElement, dimensions: { width: number; height: number }) => {
  Object.defineProperty(element, 'offsetWidth', { value: dimensions.width, configurable: true });
  Object.defineProperty(element, 'offsetHeight', { value: dimensions.height, configurable: true });
  Object.defineProperty(element, 'clientWidth', { value: dimensions.width, configurable: true });
  Object.defineProperty(element, 'clientHeight', { value: dimensions.height, configurable: true });
};

// Mock getBoundingClientRect
export const mockBoundingClientRect = (rect: Partial<DOMRect> = {}) => {
  const defaultRect: DOMRect = {
    x: 0,
    y: 0,
    width: 100,
    height: 100,
    top: 0,
    right: 100,
    bottom: 100,
    left: 0,
    toJSON: () => ({}),
  };
  return { ...defaultRect, ...rect };
};

// Assert style property
export const assertStyle = (element: HTMLElement, property: string, value: string) => {
  expect(element.style.getPropertyValue(property)).toBe(value);
};

// Assert class contains
export const assertHasClass = (element: HTMLElement, className: string) => {
  expect(element.classList.contains(className)).toBe(true);
};

// Assert class does not contain
export const assertNoClass = (element: HTMLElement, className: string) => {
  expect(element.classList.contains(className)).toBe(false);
};

// Test data-testid helpers
export const testIds = {
  dashboard: {
    container: 'token-dashboard',
    lockButton: 'lock-button',
    resetButton: 'reset-button',
    panel: (name: string) => `dashboard-panel-${name}`,
  },
  swap: {
    container: 'swap-widget',
    buyTab: 'swap-tab-buy',
    sellTab: 'swap-tab-sell',
    burnTab: 'swap-tab-burn',
    amountInput: 'swap-amount-input',
    maxButton: 'swap-max-button',
    submitButton: 'swap-submit-button',
    slippageButton: (value: string) => `slippage-${value}`,
  },
  chart: {
    container: 'price-chart',
    timeframeButton: (tf: string) => `timeframe-${tf}`,
    currentPrice: 'current-price',
    priceChange: 'price-change',
  },
  holders: {
    container: 'holders-list',
    row: (index: number) => `holder-row-${index}`,
    address: (index: number) => `holder-address-${index}`,
    balance: (index: number) => `holder-balance-${index}`,
    percentage: (index: number) => `holder-percentage-${index}`,
  },
  transactions: {
    container: 'buysells-table',
    row: (index: number) => `transaction-row-${index}`,
    type: (index: number) => `transaction-type-${index}`,
  },
  tokenInfo: {
    container: 'token-info-card',
    price: 'token-price',
    reserve: 'token-reserve',
    supply: 'token-supply',
    buyCount: 'token-buy-count',
    sellCount: 'token-sell-count',
    status: 'token-status',
    progressBar: 'bonding-progress',
  },
  tokenImage: {
    container: 'token-image-info',
    image: 'token-image',
    name: 'token-name',
    symbol: 'token-symbol',
    description: 'token-description',
    copyButton: 'copy-address-button',
    socialLinks: 'social-links',
  },
  messageBoard: {
    container: 'message-board',
    messageItem: (index: number) => `message-item-${index}`,
    input: 'message-input',
    sendButton: 'message-send-button',
  },
  liveChat: {
    container: 'live-chat',
    connectionStatus: 'chat-connection-status',
    messageItem: (index: number) => `chat-message-${index}`,
    input: 'chat-input',
    sendButton: 'chat-send-button',
    tierButton: (tier: number) => `chat-tier-${tier}`,
  },
};
