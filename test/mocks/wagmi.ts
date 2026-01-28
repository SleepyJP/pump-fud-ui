import { vi } from 'vitest';

// ═══════════════════════════════════════════════════════════════════════════════
// WAGMI MOCK UTILITIES FOR PUMP.FUD DASHBOARD TESTS
// ═══════════════════════════════════════════════════════════════════════════════

export const TEST_WALLETS = {
  whale: {
    address: '0x1111111111111111111111111111111111111111' as `0x${string}`,
    balance: BigInt('1000000000000000000000000'), // 1M tokens
    plsBalance: BigInt('100000000000000000000000'), // 100K PLS
    description: 'Holds 10% of supply - can chat',
  },
  holder: {
    address: '0x2222222222222222222222222222222222222222' as `0x${string}`,
    balance: BigInt('100000000000000000000'), // 100 tokens
    plsBalance: BigInt('10000000000000000000000'), // 10K PLS
    description: 'Holds 0.01% - cannot chat',
  },
  empty: {
    address: '0x3333333333333333333333333333333333333333' as `0x${string}`,
    balance: BigInt(0),
    plsBalance: BigInt('1000000000000000000000'), // 1K PLS
    description: 'No tokens - read only',
  },
};

export const createMockUseAccount = (connected: boolean, wallet = TEST_WALLETS.whale) => ({
  address: connected ? wallet.address : undefined,
  isConnected: connected,
  isConnecting: false,
  isDisconnected: !connected,
  isReconnecting: false,
  status: connected ? 'connected' : 'disconnected',
  connector: connected ? { id: 'mock', name: 'Mock Wallet' } : undefined,
});

export const createMockUseBalance = (wallet = TEST_WALLETS.whale) => ({
  data: {
    value: wallet.plsBalance,
    decimals: 18,
    formatted: (Number(wallet.plsBalance) / 1e18).toString(),
    symbol: 'PLS',
  },
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

export const createMockUseReadContract = <T>(data: T) => ({
  data,
  isLoading: false,
  isSuccess: true,
  isError: false,
  error: null,
  refetch: vi.fn(),
});

export const createMockUseWriteContract = () => {
  const writeContract = vi.fn();
  const reset = vi.fn();

  return {
    writeContract,
    data: undefined as `0x${string}` | undefined,
    isPending: false,
    isSuccess: false,
    isError: false,
    error: null,
    reset,
    // Helper to simulate success
    simulateSuccess: (hash: `0x${string}`) => {
      return {
        writeContract,
        data: hash,
        isPending: false,
        isSuccess: true,
        isError: false,
        error: null,
        reset,
      };
    },
    // Helper to simulate pending
    simulatePending: () => {
      return {
        writeContract,
        data: undefined,
        isPending: true,
        isSuccess: false,
        isError: false,
        error: null,
        reset,
      };
    },
  };
};

export const createMockUseWaitForTransactionReceipt = (status: 'idle' | 'pending' | 'success' | 'error' = 'idle') => ({
  isLoading: status === 'pending',
  isSuccess: status === 'success',
  isError: status === 'error',
  data: status === 'success' ? { status: 'success' } : undefined,
  error: status === 'error' ? new Error('Transaction failed') : null,
});

// Mock wagmi module
export const mockWagmiModule = (overrides: Record<string, unknown> = {}) => {
  return {
    useAccount: vi.fn(() => createMockUseAccount(true)),
    useBalance: vi.fn(() => createMockUseBalance()),
    useReadContract: vi.fn(() => createMockUseReadContract(undefined)),
    useWriteContract: vi.fn(() => createMockUseWriteContract()),
    useWaitForTransactionReceipt: vi.fn(() => createMockUseWaitForTransactionReceipt()),
    useChainId: vi.fn(() => 369),
    useConnect: vi.fn(() => ({ connect: vi.fn(), connectors: [] })),
    useDisconnect: vi.fn(() => ({ disconnect: vi.fn() })),
    ...overrides,
  };
};
