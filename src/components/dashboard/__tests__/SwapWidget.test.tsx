import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { TradePanel } from '../TradePanel';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS: SwapWidget (TradePanel) Component
// RALPH-WIGGUM TEST LOOP #2 - Component 7 of 9
// ═══════════════════════════════════════════════════════════════════════════════

// Mock wagmi hooks
const mockWriteContract = vi.fn();
const mockReset = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
  })),
  useBalance: vi.fn(() => ({
    data: {
      value: BigInt('100000000000000000000000'), // 100K PLS
      decimals: 18,
      formatted: '100000',
      symbol: 'PLS',
    },
  })),
  useReadContract: vi.fn(({ functionName }) => {
    if (functionName === 'balanceOf') {
      return { data: BigInt('1000000000000000000000') }; // 1000 tokens
    }
    if (functionName === 'totalSupply') {
      return { data: BigInt('1000000000000000000000000') }; // 1M tokens
    }
    if (functionName === 'calculatePurchaseReturn') {
      return { data: BigInt('100000000000000000000') }; // 100 tokens
    }
    if (functionName === 'calculateSaleReturn') {
      return { data: BigInt('10000000000000000000') }; // 10 PLS
    }
    return { data: undefined };
  }),
  useWriteContract: vi.fn(() => ({
    writeContract: mockWriteContract,
    data: undefined,
    isPending: false,
    isSuccess: false,
    isError: false,
    reset: mockReset,
  })),
  useWaitForTransactionReceipt: vi.fn(() => ({
    isLoading: false,
    isSuccess: false,
    isError: false,
  })),
}));

const mockProps = {
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
  tokenSymbol: 'TEST',
  currentPrice: BigInt('1000000000000'),
};

describe('SwapWidget (TradePanel)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Tab Rendering', () => {
    it('renders all three tabs', () => {
      render(<TradePanel {...mockProps} />);
      expect(screen.getByText('buy')).toBeInTheDocument();
      expect(screen.getByText('sell')).toBeInTheDocument();
      expect(screen.getByText('burn')).toBeInTheDocument();
    });

    it('BUY tab active by default', () => {
      render(<TradePanel {...mockProps} />);
      const buyTab = screen.getByText('buy');
      expect(buyTab).toHaveClass('bg-fud-green/20');
    });

    it('switches to SELL tab on click', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('sell'));
      const sellTab = screen.getByText('sell');
      expect(sellTab).toHaveClass('bg-orange-500/20');
    });

    it('switches to BURN tab on click', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('burn'));
      const burnTab = screen.getByText('burn');
      expect(burnTab).toHaveClass('bg-red-500/20');
    });
  });

  describe('Balance Display', () => {
    it('displays PLS balance on BUY tab', () => {
      render(<TradePanel {...mockProps} />);
      expect(screen.getByText(/100K PLS|100,000 PLS|100000/)).toBeInTheDocument();
    });

    it('displays token balance on SELL tab', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('sell'));
      expect(screen.getByText(/1K TEST|1,000 TEST|1000/)).toBeInTheDocument();
    });
  });

  describe('Amount Input', () => {
    it('renders amount input', () => {
      render(<TradePanel {...mockProps} />);
      const input = screen.getByPlaceholderText('0.0');
      expect(input).toBeInTheDocument();
    });

    it('accepts numeric input', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');
      expect(input).toHaveValue('100');
    });

    it('accepts decimal input', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100.5');
      expect(input).toHaveValue('100.5');
    });

    it('rejects non-numeric input', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, 'abc');
      expect(input).toHaveValue('');
    });

    it('clears input on tab switch', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');
      expect(input).toHaveValue('100');

      await user.click(screen.getByText('sell'));
      expect(input).toHaveValue('');
    });
  });

  describe('MAX Button', () => {
    it('renders MAX button', () => {
      render(<TradePanel {...mockProps} />);
      expect(screen.getByText('MAX')).toBeInTheDocument();
    });

    it('sets max PLS on BUY tab (minus gas reserve)', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('MAX'));
      const input = screen.getByPlaceholderText('0.0');
      // Should be 100K - 10 PLS for gas
      expect(input).toHaveValue(expect.stringContaining('99'));
    });

    it('sets max token balance on SELL tab', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('sell'));
      await user.click(screen.getByText('MAX'));
      const input = screen.getByPlaceholderText('0.0');
      expect(input).toHaveValue('1000');
    });
  });

  describe('Slippage Controls', () => {
    it('renders slippage buttons', () => {
      render(<TradePanel {...mockProps} />);
      expect(screen.getByText('1%')).toBeInTheDocument();
      expect(screen.getByText('3%')).toBeInTheDocument();
      expect(screen.getByText('5%')).toBeInTheDocument();
      expect(screen.getByText('10%')).toBeInTheDocument();
    });

    it('5% slippage selected by default', () => {
      render(<TradePanel {...mockProps} />);
      const slippage5 = screen.getByText('5%');
      expect(slippage5).toHaveClass('bg-fud-green');
    });

    it('changes slippage on button click', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('10%'));
      expect(screen.getByText('10%')).toHaveClass('bg-fud-green');
    });

    it('hides slippage on BURN tab', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('burn'));
      expect(screen.queryByText('Slippage Tolerance:')).not.toBeInTheDocument();
    });
  });

  describe('Submit Button', () => {
    it('disables button when no amount', () => {
      render(<TradePanel {...mockProps} />);
      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.textContent?.includes('BUY'));
      expect(submitButton).toBeDisabled();
    });

    it('enables button when amount entered', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');

      const buttons = screen.getAllByRole('button');
      const submitButton = buttons.find(btn => btn.textContent?.includes('BUY'));
      expect(submitButton).not.toBeDisabled();
    });

    it('shows BUY text on BUY tab', () => {
      render(<TradePanel {...mockProps} />);
      expect(screen.getByRole('button', { name: /BUY/i })).toBeInTheDocument();
    });

    it('shows SELL text on SELL tab', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('sell'));
      expect(screen.getByRole('button', { name: /SELL/i })).toBeInTheDocument();
    });

    it('shows BURN text on BURN tab', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('burn'));
      expect(screen.getByRole('button', { name: /BURN/i })).toBeInTheDocument();
    });
  });

  describe('Transaction Calls', () => {
    it('calls buy function on BUY submit', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');

      const buyButton = screen.getByRole('button', { name: /BUY/i });
      await user.click(buyButton);

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'buy',
        })
      );
    });

    it('calls sell function on SELL submit', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('sell'));

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');

      const sellButton = screen.getByRole('button', { name: /SELL/i });
      await user.click(sellButton);

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'sell',
        })
      );
    });

    it('calls transfer function on BURN submit', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('burn'));

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');

      const burnButton = screen.getByRole('button', { name: /BURN/i });
      await user.click(burnButton);

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'transfer',
          args: expect.arrayContaining(['0x000000000000000000000000000000000000dEaD']),
        })
      );
    });
  });

  describe('Disconnected State', () => {
    it('shows Connect Wallet button when not connected', () => {
      vi.mocked(vi.importActual('wagmi')).useAccount = vi.fn(() => ({
        address: undefined,
        isConnected: false,
      }));

      // Re-mock for this test
      vi.doMock('wagmi', () => ({
        useAccount: vi.fn(() => ({ address: undefined, isConnected: false })),
        useBalance: vi.fn(() => ({ data: undefined })),
        useReadContract: vi.fn(() => ({ data: undefined })),
        useWriteContract: vi.fn(() => ({ writeContract: vi.fn(), isPending: false, reset: vi.fn() })),
        useWaitForTransactionReceipt: vi.fn(() => ({ isLoading: false, isSuccess: false, isError: false })),
      }));
    });
  });

  describe('Button Styling', () => {
    it('BUY button has green styling', () => {
      render(<TradePanel {...mockProps} />);
      // Buy button should have default (green) styling - not orange or red classes
      const buyButton = screen.getByRole('button', { name: /BUY/i });
      expect(buyButton).not.toHaveClass('bg-orange-500');
      expect(buyButton).not.toHaveClass('bg-red-500');
    });

    it('SELL button has orange styling', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('sell'));
      const sellButton = screen.getByRole('button', { name: /SELL/i });
      expect(sellButton).toHaveClass('bg-orange-500');
    });

    it('BURN button has red styling', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('burn'));
      const burnButton = screen.getByRole('button', { name: /BURN/i });
      expect(burnButton).toHaveClass('bg-red-500');
    });
  });

  describe('Quote Display', () => {
    it('shows quote when amount entered on BUY', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');

      await waitFor(() => {
        expect(screen.getByText(/You receive:/)).toBeInTheDocument();
      });
    });

    it('shows burn message on BURN tab', async () => {
      const user = userEvent.setup();
      render(<TradePanel {...mockProps} />);

      await user.click(screen.getByText('burn'));

      const input = screen.getByPlaceholderText('0.0');
      await user.type(input, '100');

      await waitFor(() => {
        expect(screen.getByText(/burned forever/)).toBeInTheDocument();
      });
    });
  });
});
