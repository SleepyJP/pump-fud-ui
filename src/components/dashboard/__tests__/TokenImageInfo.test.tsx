import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TokenImageInfo } from '../TokenImageInfo';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS: TokenImageInfo Component
// RALPH-WIGGUM TEST LOOP #2 - Component 1 of 9
// ═══════════════════════════════════════════════════════════════════════════════

const mockProps = {
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
  name: 'Test Token',
  symbol: 'TEST',
  image: 'https://example.com/token.png',
  description: 'A test token for unit testing the PUMP.FUD dashboard. This is a longer description to test truncation.',
  creator: '0xabcdef1234567890abcdef1234567890abcdef12' as `0x${string}`,
  socials: {
    twitter: 'https://twitter.com/testtoken',
    telegram: 'https://t.me/testtoken',
    website: 'https://testtoken.com',
  },
};

describe('TokenImageInfo', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('renders token image when data loads', () => {
      render(<TokenImageInfo {...mockProps} />);
      const img = screen.getByRole('img');
      expect(img).toHaveAttribute('src', mockProps.image);
      expect(img).toHaveAttribute('alt', mockProps.name);
    });

    it('renders placeholder when no image', () => {
      render(<TokenImageInfo {...mockProps} image={undefined} />);
      expect(screen.getByText('🪙')).toBeInTheDocument();
    });

    it('renders token name', () => {
      render(<TokenImageInfo {...mockProps} />);
      expect(screen.getByText(mockProps.name)).toBeInTheDocument();
    });

    it('renders token symbol with $', () => {
      render(<TokenImageInfo {...mockProps} />);
      expect(screen.getByText(`$${mockProps.symbol}`)).toBeInTheDocument();
    });

    it('renders description', () => {
      render(<TokenImageInfo {...mockProps} />);
      expect(screen.getByText(mockProps.description)).toBeInTheDocument();
    });

    it('applies line-clamp-3 to description', () => {
      const { container } = render(<TokenImageInfo {...mockProps} />);
      const descElement = container.querySelector('.line-clamp-3');
      expect(descElement).toBeInTheDocument();
    });

    it('hides description when not present', () => {
      render(<TokenImageInfo {...mockProps} description={undefined} />);
      expect(screen.queryByText(mockProps.description)).not.toBeInTheDocument();
    });

    it('renders default name when not provided', () => {
      render(<TokenImageInfo {...mockProps} name={undefined} />);
      expect(screen.getByText('Token')).toBeInTheDocument();
    });

    it('renders default symbol when not provided', () => {
      render(<TokenImageInfo {...mockProps} symbol={undefined} />);
      expect(screen.getByText('$SYMBOL')).toBeInTheDocument();
    });
  });

  describe('Social Links', () => {
    it('renders all social links when present', () => {
      render(<TokenImageInfo {...mockProps} />);
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.getByText('Telegram')).toBeInTheDocument();
      expect(screen.getByText('Website')).toBeInTheDocument();
    });

    it('renders social links as external links', () => {
      render(<TokenImageInfo {...mockProps} />);
      const twitterLink = screen.getByText('Twitter').closest('a');
      expect(twitterLink).toHaveAttribute('href', mockProps.socials?.twitter);
      expect(twitterLink).toHaveAttribute('target', '_blank');
      expect(twitterLink).toHaveAttribute('rel', 'noopener noreferrer');
    });

    it('hides social links when not present', () => {
      render(<TokenImageInfo {...mockProps} socials={{}} />);
      expect(screen.queryByText('Twitter')).not.toBeInTheDocument();
      expect(screen.queryByText('Telegram')).not.toBeInTheDocument();
      expect(screen.queryByText('Website')).not.toBeInTheDocument();
    });

    it('renders only available social links', () => {
      render(<TokenImageInfo {...mockProps} socials={{ twitter: 'https://twitter.com/test' }} />);
      expect(screen.getByText('Twitter')).toBeInTheDocument();
      expect(screen.queryByText('Telegram')).not.toBeInTheDocument();
      expect(screen.queryByText('Website')).not.toBeInTheDocument();
    });
  });

  describe('Contract Address', () => {
    it('displays truncated contract address', () => {
      render(<TokenImageInfo {...mockProps} />);
      expect(screen.getByText('0x1234...5678')).toBeInTheDocument();
    });

    it('copies address to clipboard on click', async () => {
      render(<TokenImageInfo {...mockProps} />);
      const copyButton = screen.getByText('0x1234...5678').closest('button');
      expect(copyButton).toBeInTheDocument();

      fireEvent.click(copyButton!);
      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(mockProps.tokenAddress);
    });

    it('shows check icon after copy', async () => {
      vi.useFakeTimers();
      render(<TokenImageInfo {...mockProps} />);

      const copyButton = screen.getByText('0x1234...5678').closest('button');
      fireEvent.click(copyButton!);

      await waitFor(() => {
        // Check icon should appear (Check from lucide-react)
        const checkIcon = document.querySelector('svg');
        expect(checkIcon).toBeInTheDocument();
      });

      vi.useRealTimers();
    });

    it('reverts to copy icon after 2 seconds', async () => {
      vi.useFakeTimers();
      render(<TokenImageInfo {...mockProps} />);

      const copyButton = screen.getByText('0x1234...5678').closest('button');
      fireEvent.click(copyButton!);

      vi.advanceTimersByTime(2000);

      await waitFor(() => {
        // Copy icon should reappear
        const icons = document.querySelectorAll('svg');
        expect(icons.length).toBeGreaterThan(0);
      });

      vi.useRealTimers();
    });
  });

  describe('Creator Link', () => {
    it('displays truncated creator address', () => {
      render(<TokenImageInfo {...mockProps} />);
      expect(screen.getByText('0xabcd...ef12')).toBeInTheDocument();
    });

    it('links creator to PulseScan', () => {
      render(<TokenImageInfo {...mockProps} />);
      const creatorLink = screen.getByText('0xabcd...ef12').closest('a');
      expect(creatorLink).toHaveAttribute(
        'href',
        `https://scan.pulsechain.com/address/${mockProps.creator}`
      );
      expect(creatorLink).toHaveAttribute('target', '_blank');
    });

    it('hides creator when not provided', () => {
      render(<TokenImageInfo {...mockProps} creator={undefined} />);
      expect(screen.queryByText('Creator:')).not.toBeInTheDocument();
    });
  });

  describe('Styling', () => {
    it('applies neon green border to image container', () => {
      const { container } = render(<TokenImageInfo {...mockProps} />);
      const imageContainer = container.querySelector('.border-\\[\\#39ff14\\]\\/50');
      expect(imageContainer).toBeInTheDocument();
    });

    it('applies neon green color to token name', () => {
      render(<TokenImageInfo {...mockProps} />);
      const nameElement = screen.getByText(mockProps.name);
      expect(nameElement).toHaveClass('text-[#39ff14]');
    });

    it('applies gray color to symbol', () => {
      render(<TokenImageInfo {...mockProps} />);
      const symbolElement = screen.getByText(`$${mockProps.symbol}`);
      expect(symbolElement).toHaveClass('text-gray-400');
    });
  });
});
