import '@testing-library/jest-dom';
import { afterAll, afterEach, beforeAll, vi } from 'vitest';
import { cleanup } from '@testing-library/react';
import { server } from './mocks/server';

// ═══════════════════════════════════════════════════════════════════════════════
// PUMP.FUD DASHBOARD TEST SETUP
// CODENAME: DASHBOARD_QA_DESTROYER
// ═══════════════════════════════════════════════════════════════════════════════

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock ResizeObserver
class MockResizeObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.ResizeObserver = MockResizeObserver as unknown as typeof ResizeObserver;

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
  root = null;
  rootMargin = '';
  thresholds = [];
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock scrollIntoView
Element.prototype.scrollIntoView = vi.fn();

// Mock clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: vi.fn().mockResolvedValue(undefined),
    readText: vi.fn().mockResolvedValue(''),
  },
});

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
  length: 0,
  key: vi.fn(),
};
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

// Mock confirm dialog
window.confirm = vi.fn(() => true);

// MSW Server Setup
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));
afterEach(() => {
  cleanup();
  server.resetHandlers();
  vi.clearAllMocks();
  localStorageMock.getItem.mockClear();
  localStorageMock.setItem.mockClear();
  localStorageMock.removeItem.mockClear();
});
afterAll(() => server.close());

// Global test utilities
declare global {
  // eslint-disable-next-line no-var
  var testUtils: {
    waitForAnimation: () => Promise<void>;
    mockWalletConnected: (address: string) => void;
    mockWalletDisconnected: () => void;
  };
}

globalThis.testUtils = {
  waitForAnimation: () => new Promise((resolve) => setTimeout(resolve, 300)),
  mockWalletConnected: (address: string) => {
    vi.mock('wagmi', async () => {
      const actual = await vi.importActual('wagmi');
      return {
        ...actual,
        useAccount: () => ({ address, isConnected: true }),
      };
    });
  },
  mockWalletDisconnected: () => {
    vi.mock('wagmi', async () => {
      const actual = await vi.importActual('wagmi');
      return {
        ...actual,
        useAccount: () => ({ address: undefined, isConnected: false }),
      };
    });
  },
};

console.log('═══════════════════════════════════════════════════════════════');
console.log('🚨 RALPH-WIGGUM TEST ENVIRONMENT INITIALIZED 🚨');
console.log('═══════════════════════════════════════════════════════════════');
