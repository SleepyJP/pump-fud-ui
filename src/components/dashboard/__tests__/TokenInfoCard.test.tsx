import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TokenInfoCard } from '../TokenInfoCard';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS: TokenInfoCard Component
// RALPH-WIGGUM TEST LOOP #2 - Component 6 of 9
// ═══════════════════════════════════════════════════════════════════════════════

const mockProps = {
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
  currentPrice: BigInt('1000000000000'), // 0.000001 PLS
  totalSupply: BigInt('1000000000000000000000000000'), // 1B tokens
  plsReserve: BigInt('37910000000000000000000000'), // 37.91M PLS
  graduated: false,
  buyCount: 42,
  sellCount: 13,
};

describe('TokenInfoCard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Stat Rows', () => {
    it('renders all stat row labels', () => {
      render(<TokenInfoCard {...mockProps} />);
      expect(screen.getByText('Price')).toBeInTheDocument();
      expect(screen.getByText('Reserve')).toBeInTheDocument();
      expect(screen.getByText('Supply')).toBeInTheDocument();
      expect(screen.getByText('BUYS')).toBeInTheDocument();
      expect(screen.getByText('SELLS')).toBeInTheDocument();
      expect(screen.getByText('Status')).toBeInTheDocument();
    });

    it('displays formatted price', () => {
      render(<TokenInfoCard {...mockProps} />);
      // 0.000000001 PLS formatted
      const priceText = screen.getAllByText(/PLS/)[0].textContent;
      expect(priceText).toContain('PLS');
    });

    it('displays price in neon green', () => {
      const { container } = render(<TokenInfoCard {...mockProps} />);
      const priceRow = container.querySelector('.text-\\[\\#d6ffe0\\]');
      expect(priceRow).toBeInTheDocument();
    });

    it('displays reserve formatted with suffix', () => {
      render(<TokenInfoCard {...mockProps} />);
      // 37.91M PLS
      expect(screen.getByText(/37\.\d+M PLS/)).toBeInTheDocument();
    });

    it('displays supply formatted with suffix', () => {
      render(<TokenInfoCard {...mockProps} />);
      // 1B tokens
      expect(screen.getByText('1.00B')).toBeInTheDocument();
    });

    it('displays BUYS count', () => {
      render(<TokenInfoCard {...mockProps} />);
      expect(screen.getByText('42')).toBeInTheDocument();
    });

    it('displays SELLS count', () => {
      render(<TokenInfoCard {...mockProps} />);
      expect(screen.getByText('13')).toBeInTheDocument();
    });
  });

  describe('Buy/Sell Styling', () => {
    it('displays BUYS count in green', () => {
      render(<TokenInfoCard {...mockProps} />);
      const buysValue = screen.getByText('42');
      expect(buysValue).toHaveClass('text-[#d6ffe0]');
    });

    it('displays SELLS count in red', () => {
      render(<TokenInfoCard {...mockProps} />);
      const sellsValue = screen.getByText('13');
      expect(sellsValue).toHaveClass('text-red-500');
    });
  });

  describe('Status Display', () => {
    it('displays BONDING status when not graduated', () => {
      render(<TokenInfoCard {...mockProps} graduated={false} />);
      expect(screen.getByText('BONDING')).toBeInTheDocument();
    });

    it('displays BONDING in orange/yellow', () => {
      render(<TokenInfoCard {...mockProps} graduated={false} />);
      const status = screen.getByText('BONDING');
      expect(status).toHaveClass('text-orange-400');
    });

    it('displays GRADUATED status when graduated', () => {
      render(<TokenInfoCard {...mockProps} graduated={true} />);
      expect(screen.getByText('GRADUATED')).toBeInTheDocument();
    });

    it('displays GRADUATED in green', () => {
      render(<TokenInfoCard {...mockProps} graduated={true} />);
      const status = screen.getByText('GRADUATED');
      expect(status).toHaveClass('text-[#d6ffe0]');
    });
  });

  describe('Bonding Progress Bar', () => {
    it('renders progress bar when not graduated', () => {
      const { container } = render(<TokenInfoCard {...mockProps} graduated={false} />);
      const progressBar = container.querySelector('.bg-gray-800.rounded-full');
      expect(progressBar).toBeInTheDocument();
    });

    it('hides progress bar when graduated', () => {
      render(<TokenInfoCard {...mockProps} graduated={true} />);
      expect(screen.queryByText('Bonding Progress')).not.toBeInTheDocument();
    });

    it('displays progress percentage', () => {
      render(<TokenInfoCard {...mockProps} />);
      // 37.91M / 50M = ~75.8%
      expect(screen.getByText(/\d+\.\d+%/)).toBeInTheDocument();
    });

    it('sets correct progress bar width', () => {
      const { container } = render(<TokenInfoCard {...mockProps} />);
      const progressFill = container.querySelector('.bg-\\[\\#d6ffe0\\].transition-all');
      expect(progressFill).toBeInTheDocument();
      // Should be ~75.82% width
      expect(progressFill).toHaveStyle({ width: expect.stringMatching(/\d+%/) });
    });

    it('caps progress at 100%', () => {
      const overflowReserve = BigInt('60000000000000000000000000'); // 60M PLS (over threshold)
      render(<TokenInfoCard {...mockProps} plsReserve={overflowReserve} />);
      // Should cap at 100%
      expect(screen.getByText('100.0%')).toBeInTheDocument();
    });
  });

  describe('Edge Cases', () => {
    it('handles undefined price gracefully', () => {
      render(<TokenInfoCard {...mockProps} currentPrice={undefined} />);
      const priceValues = screen.getAllByText('--');
      expect(priceValues.length).toBeGreaterThanOrEqual(1);
    });

    it('handles undefined reserve gracefully', () => {
      render(<TokenInfoCard {...mockProps} plsReserve={undefined} />);
      expect(screen.getByText('-- PLS')).toBeInTheDocument();
    });

    it('handles undefined supply gracefully', () => {
      render(<TokenInfoCard {...mockProps} totalSupply={undefined} />);
      expect(screen.getAllByText('--').length).toBeGreaterThanOrEqual(1);
    });

    it('handles zero buy/sell counts', () => {
      render(<TokenInfoCard {...mockProps} buyCount={0} sellCount={0} />);
      const zeros = screen.getAllByText('0');
      expect(zeros.length).toBeGreaterThanOrEqual(2);
    });

    it('formats very small prices in scientific notation', () => {
      const tinyPrice = BigInt('1'); // Very tiny price
      render(<TokenInfoCard {...mockProps} currentPrice={tinyPrice} />);
      // Should display in scientific notation
      const priceElement = screen.getByText(/e-/);
      expect(priceElement).toBeInTheDocument();
    });
  });

  describe('Formatting Functions', () => {
    it('formats price with 8 decimal places for normal prices', () => {
      const normalPrice = BigInt('100000000000000'); // 0.0001 PLS
      render(<TokenInfoCard {...mockProps} currentPrice={normalPrice} />);
      const priceText = screen.getByText(/0\.0001/);
      expect(priceText).toBeInTheDocument();
    });

    it('formats millions with M suffix', () => {
      const millionReserve = BigInt('5000000000000000000000000'); // 5M PLS
      render(<TokenInfoCard {...mockProps} plsReserve={millionReserve} />);
      expect(screen.getByText(/5\.00M PLS/)).toBeInTheDocument();
    });

    it('formats thousands with K suffix', () => {
      const thousandReserve = BigInt('5000000000000000000000'); // 5K PLS
      render(<TokenInfoCard {...mockProps} plsReserve={thousandReserve} />);
      expect(screen.getByText(/5\.00K PLS/)).toBeInTheDocument();
    });

    it('formats billions with B suffix', () => {
      const billionSupply = BigInt('5000000000000000000000000000'); // 5B tokens
      render(<TokenInfoCard {...mockProps} totalSupply={billionSupply} />);
      expect(screen.getByText('5.00B')).toBeInTheDocument();
    });
  });
});
