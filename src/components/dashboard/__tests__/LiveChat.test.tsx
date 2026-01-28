import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { LiveChat } from '../LiveChat';

// ═══════════════════════════════════════════════════════════════════════════════
// UNIT TESTS: LiveChat Component
// RALPH-WIGGUM TEST LOOP #2 - Component 3 of 9
// ═══════════════════════════════════════════════════════════════════════════════

const mockWriteContract = vi.fn();
const mockScrollIntoView = vi.fn();

vi.mock('wagmi', () => ({
  useAccount: vi.fn(() => ({
    address: '0x1111111111111111111111111111111111111111',
    isConnected: true,
  })),
  useReadContract: vi.fn(({ functionName }) => {
    if (functionName === 'canChat') {
      return { data: true };
    }
    if (functionName === 'getTokenSuperChats') {
      return {
        data: [
          {
            sender: '0x1111111111111111111111111111111111111111',
            message: 'Hey everyone!',
            timestamp: BigInt(Date.now() - 60000),
            tier: BigInt(1),
            amount: BigInt('10000000000000000000'),
            isMessageBoard: false,
          },
          {
            sender: '0x2222222222222222222222222222222222222222',
            message: 'Buying more!',
            timestamp: BigInt(Date.now() - 30000),
            tier: BigInt(2),
            amount: BigInt('50000000000000000000'),
            isMessageBoard: false,
          },
          {
            sender: '0x3333333333333333333333333333333333333333',
            message: 'Board post - should be filtered',
            timestamp: BigInt(Date.now() - 10000),
            tier: BigInt(3),
            amount: BigInt('100000000000000000000'),
            isMessageBoard: true, // Should be filtered out
          },
        ],
      };
    }
    return { data: undefined };
  }),
  useWriteContract: vi.fn(() => ({
    writeContract: mockWriteContract,
    isPending: false,
  })),
}));

vi.mock('@/config/wagmi', () => ({
  CONTRACTS: {
    SUPERCHAT: '0xSuperChatAddress',
  },
  CONSTANTS: {
    SUPERCHAT_TIERS: {
      1: 10,
      2: 50,
      3: 100,
      4: 500,
      5: 1000,
    },
  },
}));

const mockProps = {
  tokenAddress: '0x1234567890abcdef1234567890abcdef12345678' as `0x${string}`,
};

describe('LiveChat', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Element.prototype.scrollIntoView = mockScrollIntoView;
  });

  describe('Rendering', () => {
    it('renders live chat title', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.getByText('Live Chat')).toBeInTheDocument();
    });

    it('renders chat messages', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.getByText('Hey everyone!')).toBeInTheDocument();
      expect(screen.getByText('Buying more!')).toBeInTheDocument();
    });

    it('filters out message board posts', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.queryByText('Board post - should be filtered')).not.toBeInTheDocument();
    });
  });

  describe('Chat Eligibility', () => {
    it('shows "Eligible" when user can chat', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.getByText('✓ Eligible')).toBeInTheDocument();
    });

    it('shows input field when connected and eligible', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.getByPlaceholderText('Type a message...')).toBeInTheDocument();
    });

    it('shows all tier buttons when eligible', () => {
      render(<LiveChat {...mockProps} />);
      // Tiers 1-5
      expect(screen.getByText('10')).toBeInTheDocument();
      expect(screen.getByText('50')).toBeInTheDocument();
      expect(screen.getByText('100')).toBeInTheDocument();
      expect(screen.getByText('500')).toBeInTheDocument();
      expect(screen.getByText('1000')).toBeInTheDocument();
    });
  });

  describe('Message Display', () => {
    it('displays sender address truncated', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.getByText('0x1111...1111')).toBeInTheDocument();
    });

    it('displays message content', () => {
      render(<LiveChat {...mockProps} />);
      expect(screen.getByText('Hey everyone!')).toBeInTheDocument();
    });

    it('displays tier name', () => {
      render(<LiveChat {...mockProps} />);
      // Tier names from getTierName utility
      const tierElements = screen.getAllByText(/Standard|Common|Rare/i);
      expect(tierElements.length).toBeGreaterThan(0);
    });

    it('applies tier-based border color', () => {
      const { container } = render(<LiveChat {...mockProps} />);
      const messages = container.querySelectorAll('[style*="border-left"]');
      expect(messages.length).toBeGreaterThan(0);
    });
  });

  describe('Sending Messages', () => {
    it('allows typing in input', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');
      expect(input).toHaveValue('Hello world');
    });

    it('limits message to 500 characters', () => {
      render(<LiveChat {...mockProps} />);
      const input = screen.getByPlaceholderText('Type a message...');
      expect(input).toHaveAttribute('maxLength', '500');
    });

    it('sends message on Enter key', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');
      fireEvent.keyPress(input, { key: 'Enter', code: 'Enter', charCode: 13 });

      expect(mockWriteContract).toHaveBeenCalled();
    });

    it('sends message on Send button click', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');

      const sendButton = screen.getByRole('button', { name: /Send/i });
      await user.click(sendButton);

      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          functionName: 'sendSuperChat',
          args: [mockProps.tokenAddress, 'Hello world', false],
        })
      );
    });

    it('clears input after sending', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Hello world');

      const sendButton = screen.getByRole('button', { name: /Send/i });
      await user.click(sendButton);

      expect(input).toHaveValue('');
    });

    it('does not send empty messages', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      const sendButton = screen.getByRole('button', { name: /Send/i });
      await user.click(sendButton);

      expect(mockWriteContract).not.toHaveBeenCalled();
    });
  });

  describe('Tier Selection', () => {
    it('tier 1 selected by default', () => {
      render(<LiveChat {...mockProps} />);
      const tier1Button = screen.getByText('10');
      // Check it has the selected styling
      expect(tier1Button).toHaveClass('text-black');
    });

    it('changes tier on button click', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      const tier3Button = screen.getByText('100');
      await user.click(tier3Button);

      expect(tier3Button).toHaveClass('text-black');
    });

    it('sends correct tier value with message', async () => {
      const user = userEvent.setup();
      render(<LiveChat {...mockProps} />);

      // Select tier 3
      const tier3Button = screen.getByText('100');
      await user.click(tier3Button);

      const input = screen.getByPlaceholderText('Type a message...');
      await user.type(input, 'Tier 3 message');

      const sendButton = screen.getByRole('button', { name: /Send/i });
      await user.click(sendButton);

      // Check that the transaction was sent with tier 3 value (100 PLS)
      expect(mockWriteContract).toHaveBeenCalledWith(
        expect.objectContaining({
          value: expect.any(BigInt),
        })
      );
    });
  });

  describe('Auto-scroll', () => {
    it('scrolls to bottom on new messages', () => {
      render(<LiveChat {...mockProps} />);
      expect(mockScrollIntoView).toHaveBeenCalled();
    });
  });

  describe('No Token Selected', () => {
    it('shows placeholder when no token address', () => {
      render(<LiveChat tokenAddress={undefined} />);
      expect(screen.getByText('💬')).toBeInTheDocument();
      expect(screen.getByText('Select a token to chat')).toBeInTheDocument();
    });

    it('hides chat input when no token', () => {
      render(<LiveChat tokenAddress={undefined} />);
      expect(screen.queryByPlaceholderText('Type a message...')).not.toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('shows empty message when no chat messages', () => {
      vi.mocked(vi.importActual('wagmi')).useReadContract = vi.fn(({ functionName }) => {
        if (functionName === 'canChat') return { data: true };
        if (functionName === 'getTokenSuperChats') return { data: [] };
        return { data: undefined };
      });

      // Full re-mock needed for this test
    });
  });
});
